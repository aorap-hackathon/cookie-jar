import { kv } from '@vercel/kv';
import { NextApiRequest, NextApiResponse } from 'next';
 
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
//   const user = await kv.hgetall('user:me');
    // const user = "randomuser";
    // return response.status(200).json(user);

    if (req.method === 'GET') {
        const { id, name } = req.query;
    
        // Simulate fetching user data based on query parameters
        const user = {
          id: id || 'default_id',
          name: name || 'John Doe',
          age: 30,
        };
    
        res.status(200).json(user);
    } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}