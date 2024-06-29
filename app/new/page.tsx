"use client";

import React from "react";
import { authGmail, authEthWallet, mintPKPCall } from "../../utils";

const New = () => {

    return (
        <div className="flex flex-col">
            <div>Demo</div>
            <button onClick={authGmail}>Auth Gmail</button>
            <button onClick={authEthWallet}>Auth EthWallet</button>
            <button onClick={mintPKPCall}>Mint PKP</button>
        </div>
    );
};

export default New;
