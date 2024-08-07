// pages/page/[id].js
import React from 'react';
import { useRouter } from 'next/router';

const Page = () => {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div>
      <h1>This is page {id}</h1>
      <p>You can fetch data based on {id} here.</p>
    </div>
  );
};

export default Page;
