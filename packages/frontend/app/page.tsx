"use client";
import React, { useState, useEffect } from 'react';
import { custom, formatEther, encodeFunctionData, getFunctionSelector, Address, CustomTransport, Hex } from 'viem';
import { suaveRigil } from 'viem/chains';
import { 
  getSuaveWallet, 
  getSuaveProvider,
  SuaveWallet,
  SuaveProvider,
  TransactionRequestSuave,
  TransactionReceiptSuave,
  TransactionSuave,
} from 'viem/chains/utils'

import { deployedAddress } from '@/constants/addresses';
import OnChainState from '../../contracts/out/OrderBookUpgradable.sol/OrderBookUpgradable.json';
import Header from '@/components/Header';
import Links from '@/components/Links';

export default function Home() {
  const [suaveWallet, setSuaveWallet] = useState<SuaveWallet<CustomTransport>>();
  const [balance, setBalance] = useState<string>();
  const [provider, setProvider] = useState<SuaveProvider<CustomTransport>>();
  const [hash, setHash] = useState<Hex>();
  const [contractState, setContractState] = useState('');
  const [pendingReceipt, setPendingReceipt] = useState<Promise<TransactionReceiptSuave>>();
  const [receivedReceipt, setReceivedReceipt] = useState<TransactionReceiptSuave>();
  const [txResult, setTxResult] = useState<TransactionSuave>();
/*
  useEffect(() => {
    if (provider) {
      fetchBalance();
      fetchState();
    }
    if (pendingReceipt) {
      pendingReceipt.then((receipt) => {
        console.log("txReceipt received:", receipt)
        setReceivedReceipt(receipt);
        setPendingReceipt(undefined);
        if (!provider) {
          console.warn("no provider detected...")
          return
        }
        provider.getTransaction({ hash: receipt.transactionHash }).then((tx) => {
          console.log("txResult received:", tx)
          setTxResult(tx as TransactionSuave);
        });
      });
    }
  }, [suaveWallet, hash, pendingReceipt, provider]);
*/
  const connectWallet = async () => {
    const ethereum = window.ethereum
    if (ethereum) {
      try {
        const [account] = await ethereum.request({ method: 'eth_requestAccounts' });
        setSuaveWallet(getSuaveWallet({
          jsonRpcAccount: account as Address,
          transport: custom(ethereum),
        }))
        const suaveProvider = getSuaveProvider(custom(ethereum));
        setProvider(suaveProvider);
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      }
    } else {
      console.log('Please install a browser wallet');
    }
  };

  const fetchBalance = async () => {
    if (!provider || !suaveWallet) {
      console.warn(`provider=${provider}\nsuaveWallet=${suaveWallet}`)
      return
    }
    const balanceFetched = await provider.getBalance({ address: suaveWallet.account.address });
    setBalance(formatEther(balanceFetched));
  };


  const getFunds = async () => {
    // default funded key in local SUAVE devenv
    const privateKey = '0x91ab9a7e53c220e6210460b65a7a3bb2ca181412a8a7b43ff336b3df1737ce12';
    const fundingWallet = getSuaveWallet({ privateKey: privateKey, transport: custom(window.ethereum) });
    const fundTx = {
      to: suaveWallet?.account.address,
      value: 1000000000000000000n,
      type: '0x0' as '0x0',
      gas: 21000n,
      gasPrice: 1000000000n,
    } as TransactionRequestSuave;
    const sendRes = await fundingWallet.sendTransaction(fundTx);
    setHash(sendRes);
  }

  const sendExample = async () => {
    if (!provider || !suaveWallet) {
      console.warn(`provider=${provider}\nsuaveWallet=${suaveWallet}`)
      return
    }
    const nonce = await provider.getTransactionCount({ address: suaveWallet.account.address });
    const ccr: TransactionRequestSuave = {
      confidentialInputs: '0x',
      kettleAddress: '0xB5fEAfbDD752ad52Afb7e1bD2E40432A485bBB7F', // Use 0x03493869959C866713C33669cA118E774A30A0E5 on Rigil.
      to: deployedAddress,
      gasPrice: 2000000000n,
      gas: 100000n,
      type: '0x43',
      chainId: 16813125, // chain id of local SUAVE devnet and Rigil
      data: encodeFunctionData({
        abi: OnChainState.abi,
        functionName: 'example',
      }),
      nonce
    };
    const hash = await suaveWallet.sendTransaction(ccr);
    console.log(`Transaction hash: ${hash}`);
    setPendingReceipt(provider.waitForTransactionReceipt({ hash }));
  }

  const sendNilExample = async () => {
    alert("A confidential request fails if it tries to modify the state directly.")
  }

  const fetchState = async () => {
    if (!provider || !suaveWallet) {
      console.warn(`provider=${provider}\nsuaveWallet=${suaveWallet}`)
      return
    }
    const data = await provider.readContract({
      address: deployedAddress,
      abi: OnChainState.abi,
      functionName: 'state',
    });
    const toDisplay = (data as any).toString();
    setContractState(toDisplay);
  };

  const account = suaveWallet?.account.address;

  return (
    <>
    <main className="flex min-h-screen flex-col items-center justify-between p-10 lg:p-24">

<div id="root">
  <header className="navbar">
    <div className="navbar-header-wrapper">
      <a className="navbar-header-selected navbar-header" href="/trade">Trade</a>
    </div>
    <button id="button-connect-wallet" className="button-valid button-connect-wallet">Connect MetaMask</button>
  </header>
  <main className="main-wrapper">
    <div className="container">
      <div className="flipcard top-bar-item">
        <div className="left">
          <div className="pair-wrapper">
            <img src="./images/eth-icon.svg" alt="ethereum icon"/>
            <div id="pair" className="user-input-entered">ETH-USD</div>
          </div>
          <div className="select-market-wrapper">
            <div id="select-a-market" className="top-bar-description">Select a market</div>
            <img src="./images/bx-chevron-down.svg" alt="dropdown button"/>
          </div>
        </div>
        <div className="right">
          <div className="top-bar-item">
            <div className="top-bar-description">Oracle price</div>
            <div id="price-oracle-value" className="top-bar-value">$-</div>
          </div>
          <div className="top-bar-item">
            <div className="top-bar-description">Block number</div>
            <div id="block-number-value" className="top-bar-value">-</div>
          </div>
        </div>
      </div>
      <div className="flipcard main-item-left">
        <p className="title-selected">Limit</p>
        <div className="not-title-wrapper">
          <div className="top-wrapper">
            <div className="label-wrapper">
              <div className="label-user-input">
                <p className="label-user-input-text">Size</p>
                <div className="tooltip">
                  <img className="question-circle-icon" src="./images/circle-question-regular.svg" alt="explanation icon" />
                  <span className="tooltiptext">The amount of ETH or USD that will get traded</span>
                </div>
              </div>
              <div className="inputs">
                <div className="input-wrapper" id="eth-inpur-wrapper">
                  <input id="eth-size" type="tel" className="user-input-entered" placeholder="0.000"/>
                  <p className="label-currency currency-next-to-size">ETH</p>
                </div>
                <div className="input-wrapper">
                  <input id="usd-size" type="tel" className="user-input-entered" placeholder="0.00"/>
                  <p className="label-currency currency-next-to-size">USD</p>
                </div>
              </div>
            </div>
            <div className="label-wrapper">
              <div className="label-user-input">
                <p className="label-user-input-text">Limit Price</p>
                <div className="tooltip">
                  <img className="question-circle-icon" src="./images/circle-question-regular.svg" alt="explanation icon"/>
                  <span className="tooltiptext">The price of 1 ETH</span>
                </div>
              </div>
              <div className="inputs">
                <div className="input-wrapper">
                  <input id="limit-price" type="tel" inputMode="decimal" className="user-input-entered" placeholder="0.00"/>
                  <p className="label-currency currency-next-to-size">USD</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bottom-wrapper">
            <div className="fee-table">
              <div className="fee-row-wrapper">
                <div className="header-cell-vertical fee-row-header">Fee (0.1%)</div>
                <div id="fee-value" className="value-cell-vertical fee-row-value">Hover over a button</div>
              </div>
              <div className="fee-row-wrapper">
                <div className="header-cell-vertical fee-row-header">Order Value</div>
                <div id="total-value" className="value-cell-vertical fee-row-value">-</div>
              </div>
            </div>
            <div className="buy-and-sell-button-wrapper">
              <button id="buy-button" className="buy-button button-valid">Buy ETH</button>
              <button id="sell-button" className="sell-button button-valid">Sell ETH</button>
            </div>
            
          </div>
        </div>
      </div>
      <div className="flipcard main-item-right">
        <p className="title-selected">Orderbook</p>
        <div className="orderbook-wrapper">
          <div className="header header-cell-vertical">
            <div className="one">Limit Price (USD)</div>
            <div className="two">Size (ETH)</div>
          </div>
          <div id="ob-table" className="main">
            <div className="sell-ob sell-price">
              <div className="row">
                <div className="price">Loading...</div>
                <div className="size order-size">Loading...</div>
              </div>
            </div>
            <div className="mid-bar header-cell-vertical">
              <div className="one">-</div>
              <div className="two">Spread</div>
            </div>
            <div className="buy-ob buy-price">
              <div className="row">
                <div className="price">Loading...</div>
                <div className="size order-size">Loading...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flipcard bottom-main">
        <p className="title-selected">Active orders</p>
        <div className="active-orders-table-wrapper">
          <header className="header header-cell-vertical">
            <div className="one">Side</div>
            <div className="two">Price (USD)</div>
            <div className="three">Size (ETH)</div>
            <div className="four">Value (USD)</div>
            <div className="five">Action</div>
          </header>
          <div id="active-orders-main">
            <div className="row value-cell-vertical">
              <div className="buy-side one">BUY</div>
              <div className="two">Loading...</div>
              <div className="three">Loading...</div>
              <div className="four">Loading...</div>
              <div className="five">
                <button className="sell-price cancel-button">Cancel</button>
              </div>
            </div>
            <div className="row value-cell-vertical">
              <div className="sell-side one">SELL</div>
              <div className="two">Loading...</div>
              <div className="three">Loading...</div>
              <div className="four">Loading...</div>
              <div className="five">
                <button className="sell-price cancel-button">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>


      <Header />
      <div className="flex flex-col gap-4 lg:flex-row w-full lg:w-[1024px] mt-8">
        <div className="flex-auto border border-gray-300 bg-gradient-to-b from-zinc-200 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 rounded-xl p-10">
          <p className='text-2xl font-bold mt-4 mb-8'>
            Account Actions
          </p>
          <div className="relative flex my-8">
            {account ?
              <div>
                <p><b>Connected Account:</b></p>
                <code>{suaveWallet.account.address ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}</code>
              </div> :
              <button
                className='border border-black rounded-lg bg-black text-white p-2 md:p-4 dark:bg-transparent dark:text-black'
                onClick={connectWallet}
              >
                Connect Wallet
              </button>}
          </div>
          <div className="relative flex my-8">
            <p><b>Your balance:</b> {balance}</p>
          </div>
          {account && (
            <div className="relative flex my-8">
              <button
                className='border border-black rounded-lg bg-black text-white p-2 md:p-4 dark:bg-transparent dark:text-black'
                onClick={getFunds}
              >
                Get Funds
              </button>
            </div>
          )}
        </div>

        <div className="flex-auto border border-gray-300 bg-gradient-to-b from-zinc-200 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 rounded-xl p-10">
          <p className='text-2xl font-bold mt-4 mb-8'>
            Contract Actions
          </p>
          <p>Your contract is deployed locally at <code><b>{deployedAddress.slice(0, 6)}...{deployedAddress.slice(-4)}</b></code></p>

          {account && (
            <div>
              <div className='flex flex-col col-2 md:flex-row'>
                <div className='border border-gray-300 rounded-xl mx-2 my-4 p-4 w-full'>
                  <p className='text-l font-bold'>Use callback</p>
                  <button
                    className='border border-black rounded-lg bg-black text-white p-2 md:p-4 my-4 dark:bg-transparent dark:text-black'
                    onClick={sendExample}
                  >
                    example()
                  </button>
                </div>
                <div className='border border-gray-300 rounded-xl mx-2 my-4 p-4 w-full'>
                  <p className='text-l font-bold'>Change directly</p>
                  <button
                    className='border border-black rounded-lg bg-black text-white p-2 md:p-4 my-4 dark:bg-transparent dark:text-black'
                    onClick={sendNilExample}
                  >
                    nilExample()
                  </button>
                </div>
              </div>
              <div>
                <p
                  className='mt-4 border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl static w-auto rounded-xl border bg-gray-200 p-4 dark:text-black'
                >
                  State: {contractState}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='row'>
        {hash &&
          <div className='my-4 border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl static w-auto rounded-xl border bg-gray-200 p-4 w-full'>
            <p>Funded wallet! Tx hash: <code>{hash.slice(0, 6)}...{hash.slice(-4)}</code></p>
          </div>
        }
{/*
        {pendingReceipt && <div>
          <p>Fund transaction <code>{hash.slice(0, 6)}...{hash.slice(-4)}</code> pending...</p>
        </div>}
        */}
        {receivedReceipt && <div>
          <p>Confidential Compute Request <code>{receivedReceipt.transactionHash.slice(0, 6)}...{receivedReceipt.transactionHash.slice(-4)}</code>{ } <span style={{ color: receivedReceipt.status === 'success' ? '#0f0' : '#f00' }}>{receivedReceipt.status}</span></p>
        </div>}
      </div>

      {txResult && <div>
        <p>
          Confidential Compute Result <code style={{ color: txResult.confidentialComputeResult === getFunctionSelector('exampleCallback()') ? "#0f0" : "#f00" }}>{txResult.confidentialComputeResult}</code>
        </p>
      </div>}

      <Links />

    </main>
    </>
  )
}
