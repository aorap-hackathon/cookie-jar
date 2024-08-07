import React from 'react';
import { useRouter } from 'next/router';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { kv } from "@vercel/kv";
import { useAccount } from 'wagmi';

const Page = () => {
  const router = useRouter();
  const { address } = useAccount()
  const { id, chain } = router.query;


  kv.set(address as string, "{id}");

  return (
    <div>
      <ConnectButton />
      <h1>This is jar {id} on chain {chain}</h1>
      <p>You can fetch data based on {id} here.</p>
    </div>
  );
};

export default Page;
