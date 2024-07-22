"use client";
import { useState, useEffect } from "react";
// import { createSessionWithEthWallet, mintPKP, newlyMintedPKP, fetchMintedPKPs, mintCapacityCreditsNFT, delegateCapacityCreditsNFT,
//     addAuthMethod, seeAuthMethods, uploadLitActionToIPFS, executeLitAction, authenticateWithGoogle, createSession,
//     getGoogleAuthMethod,
//  } from "../utils3";

import {
    mintPKPUsingEthWallet,
    transferPKPToItself,
    fundPKP,
    addAnotherAuthToPKP,
    RemoveInitialAuthMethod,
    addAnotherAuthToPKP2,
    seeAuthMethods,
    removeInitialAuth2,
} from "../utils";

export default function Home() {
    const [ethAddress, setEthAddress] = useState("");

    // useEffect(() => {
    //     setEthAddress(newlyMintedPKP?.ethAddress);
    // }, [ethAddress]);

    async function mintPKPCall() {
        const pkp = await mintPKPUsingEthWallet();
        setEthAddress(pkp?.ethAddress);
    }

    return (
        <div className="flex flex-col w-[100vw]">
            <h2 className="text-2xl flex justify-center">LIT DEMO</h2>
            <p className="flex justify-center mt-[2rem]">
                pkp eth address, {ethAddress}
            </p>

            <div className="flex flex-col mt-[2rem] gap-[0.8rem]">
                {/* <button onClick={mintPKPCall}>Mint PKP</button>

                <button onClick={fetchMintedPKPs}>Fetch PKPs</button>

                <button onClick={mintCapacityCreditsNFT}>Mint Capacity Credits NFT</button>

                <button onClick={delegateCapacityCreditsNFT}>Delegate NFT to PKP</button>

                <button onClick={authenticateWithGoogle}>Google Auth</button>

                <button onClick={getGoogleAuthMethod}>See Google Auth Method</button>

                <button onClick={addAuthMethod}>Add Auth Method</button>
                
                <button onClick={seeAuthMethods}>See Permitted Method</button>

                <button onClick={createSessionWithEthWallet}>Session Signature</button>
                
                <button onClick={uploadLitActionToIPFS}>Upload Lit Action to IPFS</button>
                
                <button onClick={executeLitAction}>Execute Lit Action</button> */}

                {/*  */}

                {/* <button onClick={mintPKPUsingEthWallet}>Mint PKP with First Auth</button>

                <button onClick={transferPKPToItself}>Transfer To Itself</button>

                <button onClick={fundPKP}>Fund PKP</button>

                <button onClick={addAnotherAuthToPKP}>Add Second Auth</button>

                <button onClick={RemoveInitialAuthMethod}>Remove First Auth</button> */}

                {/*  */}

                <button onClick={mintPKPCall}>Mint PKP with First Auth</button>

                <button onClick={addAnotherAuthToPKP2}>Add Second Auth</button>

                <button onClick={seeAuthMethods}>See Permitted Method</button>

                <button onClick={removeInitialAuth2}>Remove First Auth</button>
            </div>
        </div>
    );
}
