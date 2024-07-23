import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitAuthClient, isSignInRedirect } from "@lit-protocol/lit-auth-client";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { ethers, Wallet, BigNumber } from "ethers";
import {
    ProviderType,
    AuthMethodType,
    AuthMethodScope,
    LitNetwork,
    LIT_RPC
} from "@lit-protocol/constants";
import {
    LitActionResource,
    createSiweMessageWithRecaps,
    generateAuthSig,
    LitPKPResource,
} from "@lit-protocol/auth-helpers";
import { LitAbility } from "@lit-protocol/types";
import { ipfsHelpers } from "ipfs-helpers";
import { litActionA, litActionB } from "./actions";
import bs58 from "bs58";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";

const litNodeClient = new LitNodeClient({
    alertWhenUnauthorized: false,
    litNetwork: "datil-dev",
    debug: true,
    rpcUrl: LIT_RPC.CHRONICLE_YELLOWSTONE,
});

const litAuthClient = new LitAuthClient({
    litRelayConfig: {
        relayApiKey: "api key",
    },
    litNodeClient,
    debug: true,
});

export let newlyMintedPKP = {}


// helper functions --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

async function uploadLitActionToIPFS(litActionCode) {
    const ipfsHash = await ipfsHelpers.stringToCidV0(litActionCode);

    console.log("ipfsHash: ", ipfsHash);

    return ipfsHash;
}

async function stringToBytes(_string) {
    const LIT_ACTION_IPFS_CID_BYTES = `0x${Buffer.from(
        bs58.decode(_string)
    ).toString("hex")}`;

    return LIT_ACTION_IPFS_CID_BYTES;
}

async function getAnotherWallet() {
    const provider = new ethers.providers.JsonRpcProvider(
        `https://vesuvius-rpc.litprotocol.com`
    );

    const wallet = new Wallet(
        process.env.NEXT_PUBLIC_PRIVATE_KEY,
        provider
    );

    return wallet;
}

export async function seeAuthMethods() {
    console.log("started..");

    const litContracts = new LitContracts({
        network: "datil-dev",
    });
    await litContracts.connect();

    const authMethods =
        await litContracts.pkpPermissionsContract.read.getPermittedAuthMethods(
            newlyMintedPKP.tokenId
        );

    console.log(authMethods);
}


// 1st approach --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// current user mints a new pkp
export async function mintPKPUsingEthWallet() {
    console.log("started..");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const ethersSigner = provider.getSigner();

    const litContracts = new LitContracts({
        signer: ethersSigner,
        network: LitNetwork.DatilDev,
        debug: false,
    });

    await litContracts.connect();

    const mintedPkp = await litContracts.pkpNftContractUtils.write.mint();

    console.log("Minted PKP NFT: ", mintedPkp.pkp);

    newlyMintedPKP = mintedPkp.pkp;

    const ipfsCID = await uploadLitActionToIPFS(litActionA);

    const addAuthMethodAReceipt = await litContracts.addPermittedAction({
        pkpTokenId: mintedPkp.pkp.tokenId,
        ipfsId: ipfsCID,
        authMethodScopes: [AuthMethodScope.SignAnything],
    });

    console.log("addAuthMethodAReceipt: ", addAuthMethodAReceipt);

    const bytesCID = await stringToBytes(ipfsCID);

    let isPermittedA =
        await litContracts.pkpPermissionsContract.read.isPermittedAction(
            mintedPkp.tokenId,
            bytesCID
        );

    console.log("isPermittedA: ", isPermittedA);

    return mintedPkp.pkp;
}

// pkp is now owner of itself
export async function transferPKPToItself() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const ethersSigner = provider.getSigner();
    const address = await provider.send("eth_requestAccounts", []);

    const litContracts = new LitContracts({
        signer: ethersSigner,
        network: LitNetwork.DatilDev,
        debug: false,
    });

    await litContracts.connect();

    console.log(address[0], newlyMintedPKP.ethAddress, newlyMintedPKP.tokenId);

    const transferPkpOwnershipReceipt =
        await litContracts.pkpNftContract.write.transferFrom(
            address[0],
            newlyMintedPKP.ethAddress,
            newlyMintedPKP.tokenId,
            {
                gasLimit: 125_000,
            }
        );

    await transferPkpOwnershipReceipt.wait();

    console.log("tx: ", transferPkpOwnershipReceipt);
}

// funded pkp for sending transaction
export async function fundPKP() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const ethersSigner = provider.getSigner();

    const fundPkpTxReceipt = await ethersSigner.sendTransaction({
        to: newlyMintedPKP.ethAddress,
        value: ethers.utils.parseEther("0.00001"),
    });

    await fundPkpTxReceipt.wait();

    const balance = await ethersSigner.provider.getBalance(
        newlyMintedPKP.ethAddress,
        "latest"
    );
    console.log(`✅ Got balance: ${ethers.utils.formatEther(balance)} ether`);
}

// takes current user sign with litActionA for a session to create PKPEthersWallet
// addPermittedAction is called with litActionB by PKPEthersWallet
export async function addAnotherAuthToPKP() {
    console.log("started..");

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const ethersSigner = provider.getSigner();
    const address = await provider.send("eth_requestAccounts", []);

    await litNodeClient.connect();

    const ipfsCID_A = await uploadLitActionToIPFS(litActionA);

    const pkpSessionSigsA = await litNodeClient.getLitActionSessionSigs({
        pkpPublicKey: newlyMintedPKP.publicKey,
        resourceAbilityRequests: [
            {
                resource: new LitPKPResource("*"),
                ability: LitAbility.PKPSigning,
            },
            {
                resource: new LitActionResource("*"),
                ability: LitAbility.LitActionExecution,
            },
        ],
        litActionIpfsId: ipfsCID_A,
        jsParams: {
            authSig: JSON.stringify(
                await generateAuthSig({
                    signer: ethersSigner,
                    // @ts-ignore
                    toSign: await createSiweMessageWithRecaps({
                        uri: "http://localhost",
                        expiration: new Date(
                            Date.now() + 1000 * 60 * 60 * 24
                        ).toISOString(), // 24 hours
                        walletAddress: "0x48e6a467852Fa29710AaaCDB275F85db4Fa420eB",
                        nonce: await litNodeClient.getLatestBlockhash(),
                        litNodeClient,
                    }),
                })
            ),
        },
    });

    const pkpEthersWalletA = new PKPWallet({
        litNodeClient,
        pkpPubKey: newlyMintedPKP.publicKey,
        controllerSessionSigs: pkpSessionSigsA,
    });

    await pkpEthersWalletA.init();

    const litContractsPkpSignerA = new LitContracts({
        signer: pkpEthersWalletA,
        network: LitNetwork.DatilDev,
        debug: false,
    });

    await litContractsPkpSignerA.connect();

    console.log("contracts client connected")

    const ipfsCID_B = await uploadLitActionToIPFS(litActionB);
    const bytesCID_B = await stringToBytes(ipfsCID_B);

    const addAuthMethodBReceipt =
        await litContractsPkpSignerA.pkpPermissionsContract.write.addPermittedAction(
            newlyMintedPKP.tokenId,
            bytesCID_B,
            [AuthMethodScope.SignAnything],
            {
                gasPrice: "1",
                gasLimit: 250_000,
            }
        );

    await addAuthMethodBReceipt.wait();

    const isPermittedB =
        await litContractsPkpSignerA.pkpPermissionsContract.read.isPermittedAction(
            newlyMintedPKP.tokenId,
            bytesCID_B
        );

    console.log("isPermittedB: ", isPermittedB);
}

// takes second wallet and litActionB for a session sign to create PKPEthersWallet
// removePermittedAction is called with litActionA by PKPEthersWallet
export async function RemoveInitialAuthMethod() {
    const anotherAuthWallet = await getAnotherWallet();

    const ipfsCID_B = await uploadLitActionToIPFS(litActionB);
    const bytesCID_B = await stringToBytes(ipfsCID_B);

    const pkpSessionSigsB = await litNodeClient.getLitActionSessionSigs({
        pkpPublicKey: newlyMintedPKP.publicKey,
        resourceAbilityRequests: [
            {
                resource: new LitPKPResource("*"),
                ability: LitAbility.PKPSigning,
            },
            {
                resource: new LitActionResource("*"),
                ability: LitAbility.LitActionExecution,
            },
        ],
        litActionIpfsId: ipfsCID_B,
        jsParams: {
            authSig: JSON.stringify(
                await generateAuthSig({
                    signer: anotherAuthWallet,
                    // @ts-ignore
                    toSign: await createSiweMessageWithRecaps({
                        uri: "http://localhost",
                        expiration: new Date(
                            Date.now() + 1000 * 60 * 60 * 24
                        ).toISOString(), // 24 hours
                        walletAddress: anotherAuthWallet.address,
                        nonce: await litNodeClient.getLatestBlockhash(),
                        litNodeClient,
                    }),
                })
            ),
        },
    });
    console.log("✅ Got PKP Session Sigs using Lit Action Auth Method B");

    const pkpEthersWalletB = new PKPWallet({
        litNodeClient,
        pkpPubKey: newlyMintedPKP.publicKey,
        controllerSessionSigs: pkpSessionSigsB,
    });

    await pkpEthersWalletB.init();

    const litContractsPkpSignerB = new LitContracts({
        signer: pkpEthersWalletB,
        network: LitNetwork.DatilDev,
        debug: false,
    });

    await litContractsPkpSignerB.connect();

    const removeAuthMethodAReceipt =
        await litContractsPkpSignerB.pkpPermissionsContract.write.removePermittedAction(
            newlyMintedPKP.tokenId,
            bytesCID_B,
            {
                gasPrice: await ethersSignerA.provider.getGasPrice(),
                gasLimit: 100_000,
            }
        );

    await removeAuthMethodAReceipt.wait();

    isPermittedA =
        await pkpEthersWalletB.pkpPermissionsContract.read.isPermittedAction(
            newlyMintedPKP.tokenId,
            bytesCID_B
        );

    console.log("isPermittedA: ", isPermittedA);
}

// 2nd approach --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// current user mints a new pkp
export async function mintPKPUsingEthWallet2() {
    console.log("started..");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const ethersSigner = provider.getSigner();

    const litContracts = new LitContracts({
        signer: ethersSigner,
        network: LitNetwork.DatilDev,
        debug: false,
        rpc: `https://vesuvius-rpc.litprotocol.com`,
    });

    await litContracts.connect();

    const mintedPkp = await litContracts.pkpNftContractUtils.write.mint();

    console.log("Minted PKP NFT: ", mintedPkp.pkp);

    newlyMintedPKP = mintedPkp.pkp;

    const ipfsCID = await uploadLitActionToIPFS(litActionA);

    const addAuthMethodAReceipt = await litContracts.addPermittedAction({
        pkpTokenId: mintedPkp.pkp.tokenId,
        ipfsId: ipfsCID,
        authMethodScopes: [AuthMethodScope.SignAnything],
    });

    console.log("addAuthMethodAReceipt: ", addAuthMethodAReceipt);

    const bytesCID = await stringToBytes(ipfsCID);

    let isPermittedA =
        await litContracts.pkpPermissionsContract.read.isPermittedAction(
            mintedPkp.tokenId,
            bytesCID
        );

    console.log("isPermittedA: ", isPermittedA);

    return mintedPkp.pkp;
}

// current user adds a new auth method to pkp
export async function addAnotherAuthToPKP2() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const ethersSigner = provider.getSigner();

    const litContractsSignerA = new LitContracts({
        signer: ethersSigner,
        network: LitNetwork.DatilDev,
        debug: false,
    });

    await litContractsSignerA.connect();

    const ipfsCID = await uploadLitActionToIPFS(litActionB);
    const bytesCID = await stringToBytes(ipfsCID);

    const addAuthMethodBReceipt =
        await litContractsSignerA.pkpPermissionsContract.write.addPermittedAction(
            newlyMintedPKP.tokenId,
            bytesCID,
            [AuthMethodScope.SignAnything]
        );

    await addAuthMethodBReceipt.wait();

    const isPermittedB =
        await litContractsSignerA.pkpPermissionsContract.read.isPermittedAction(
            newlyMintedPKP.tokenId,
            bytesCID
        );

    console.log("isPermittedB: ", isPermittedB);
}

// another auth user attempts remove initial auth method
export async function removeInitialAuth2() {
    const anotherAuthWallet = await getAnotherWallet();

    const litContractsSignerB = new LitContracts({
        signer: anotherAuthWallet,
        network: LitNetwork.DatilDev,
        debug: false,
    });

    await litContractsSignerB.connect();

    const ipfsCID = await uploadLitActionToIPFS(litActionA);
    const bytesCID = await stringToBytes(ipfsCID);
 
    const removeAuthMethodAReceipt =
        await litContractsSignerB.pkpPermissionsContract.write.removePermittedAction(
            newlyMintedPKP.tokenId,
            bytesCID,
        );

    await removeAuthMethodAReceipt.wait();

    const isPermittedA =
        await litContractsSignerB.pkpPermissionsContract.read.isPermittedAction(
            newlyMintedPKP.tokenId,
            bytesCID
        );

    console.log("isPermittedA: ", isPermittedA);
}