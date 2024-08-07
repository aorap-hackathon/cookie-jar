import React, {useEffect, useState} from 'react';
import { useRouter } from 'next/router';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

const Page = () => {
  const router = useRouter();
  const { address } = useAccount()
  const { id, chain } = router.query;
  const [user, setUser] = useState(null);


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

  return (
    <div>
      <ConnectButton />
      <h1>This is jar {id} on chain {chain} for user {user}</h1>
      <p>You can fetch data based on {id} here.</p>
    </div>
  );
};

export default Page;
