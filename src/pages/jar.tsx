import React, {useEffect, useState} from 'react';
import { useRouter } from 'next/router';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { parseEther } from 'viem'
import styles from '../styles/Home.module.css';
import { writeContract } from '@wagmi/core'
import { config } from '../wagmi';
import { validChainIds, jarContractAbi, priceFeedId } from './index';

const Page = () => {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId() as typeof validChainIds[number];
  const { jarAddress, chain } = router.query;
  const [user, setUser] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const queryParams = new URLSearchParams({
          id: '123',
          name: 'Alice',
        }).toString();
        
        const response = await fetch('/api/user');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log(data);
        setUser(data);
      } catch (error) {
        console.log(error);
      } finally {
      }
    };

    fetchUser();
  }, []);

  const deposit = async () => {
    try {
      const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${priceFeedId[chainId]}`);
      const data = await response.json();
      const binaryData = [`0x${data.binary.data[0]}`];
      const price = Number(data.parsed[0].price.price) / Number(1e8);


      const result = await writeContract(config, {
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'deposit',
        value: parseEther(`${Number(depositAmount)*(2+Math.random())/price}`),
        args: [
          depositAmount,
          depositNote,
          binaryData,
        ],
      })
      console.log('Native deposit successful', result);
    } catch (error) {
      console.error('Error depositing native token:', error);
    }
  };

  const withdraw = async () => {
    try {
      const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${priceFeedId[chainId]}`);
      const data = await response.json();
      const binaryData = [`0x${data.binary.data[0]}`];


      const result = await writeContract(config, {
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'withdraw',
        args: [
          withdrawAmount,
          withdrawNote,
          binaryData,
        ],
      })

      console.log('Native withdrawal successful', result);
    } catch (error) {
      console.error('Error withdrawing native token:', error);
    }
  };

  return (
    <div>
      <ConnectButton />
      <h1>This is jar {jarAddress} on chain {chain} for user {address}</h1>
      <p>You can fetch data based on here.</p>
      <div className={styles.verticalAlign}>
        <div>
          <input
            type="number"
            placeholder="Amount"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Note"
            value={depositNote}
            onChange={(e) => setDepositNote(e.target.value)}
          />
          <button onClick={deposit} className={styles.modalButton}>Deposit Native</button>
        </div>
        <div>
          <input
            type="number"
            placeholder="Amount"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Note"
            value={withdrawNote}
            onChange={(e) => setWithdrawNote(e.target.value)}
          />
          <button onClick={withdraw} className={styles.modalButton}>Withdraw Native</button>
        </div>

        {/* <button onClick={() => deposit(2, 'deposit')} className={styles.modalButton}>Deposit Native</button>
        <button onClick={() => withdraw(1, 'Test Withdrawal')} className={styles.modalButton}>Withdraw Native</button> */}
      </div>
    </div>
  );
};

export default Page;
