import { kv } from '@vercel/kv';
import { NextApiRequest, NextApiResponse } from 'next';
import { Jar } from "../index";
 
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
//   const user = await kv.hgetall('user:me');
    // const user = "randomuser";
    // return response.status(200).json(user);

    if (req.method === 'GET') {
        const { address, chain } = req.query as { address?: string; chain?: string };
        if (!address || !chain) {
            return res.status(400).json({ error: 'Address and chain are required' });
        }
        // await kv.del(address + ";" + chain);
        const result = await kv.get(address + ";" + chain);
        let jars: Jar[] = [];
        if (result != null) {
            // Ensure result is an array or initialize it as an empty array
            jars = Array.isArray(result) ? result : [];
        }
    
        res.status(200).json(jars);
    } else if (req.method === 'POST') {
        const jar: Jar = req.body;

        const { address, chain } = req.query as { address?: string; chain?: string };
        if (!address || !chain) {
            return res.status(400).json({ error: 'Address and chain are required' });
        }

        let result = await kv.get(address + ";" + chain);
        let jars: Jar[] = [];
        if (result != null) {
            // Ensure result is an array or initialize it as an empty array
            jars = Array.isArray(result) ? result : [];
        }

        await kv.set(address + ";" + chain, [jar, ...jars]);

        // Respond with the created jar
        res.status(200).json(jar);
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}