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
        const { address, chain } = req.query;
        let jars = [{
            id: "jar1",
        }, {
            id: "jar2",
        }];
        kv.del(address + ";" + chain);
        const value = await kv.get(address + ";" + chain);
        if (value == null) {
            jars = [];
        }
        // console.log('VALUE:', value);
        // await kv.set(address + ";" + chain, []);
    
        // Simulate fetching user data based on query parameters
        // const jars = [{
        //     id: "jar1",
        // }, {
        //     id: "jar2",
        // }];
    
        res.status(200).json(jars);
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}