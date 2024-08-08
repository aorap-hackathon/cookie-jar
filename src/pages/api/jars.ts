import { kv } from '@vercel/kv';
import { NextApiRequest, NextApiResponse } from 'next';
import { Jar, Operation } from "../index";
 
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
//   const user = await kv.hgetall('user:me');
    // const user = "randomuser";
    // return response.status(200).json(user);

    if (req.method === 'GET') {
        const { address, jarAddress, chain } = req.query as { address?: string; jarAddress?: string, chain?: string };
        if ((!address && !jarAddress) || !chain) {
            return res.status(400).json({ error: '(Address and chain) or (jarAddress and chain) are required' });
        }
        if (address != null) {
            // await kv.del(address + ";" + chain);
            const result = await kv.get(address + ";" + chain);
            let jars: Jar[] = [];
            if (result != null) {
                // Ensure result is an array or initialize it as an empty array
                jars = Array.isArray(result) ? result : [];
            }
        
            res.status(200).json(jars);
        } else {
            const result = await kv.get("jar:" + jarAddress + ";" + chain);
            let operations: Operation[] = [];
            if (result != null) {
                // Ensure result is an array or initialize it as an empty array
                operations = Array.isArray(result) ? result : [];
            }

            // jars = [{id: 0, isDeposit: true, amount: 1, note: "test deposit", score: 0, user: "test"}, {id: 0, isDeposit: false, amount: 2, note: "test withdraw", score: -1, user: "test"}];
        
            res.status(200).json(operations);
        }
    } else if (req.method === 'POST') {
        const { address, jarAddress, chain } = req.query as { address?: string; jarAddress?: string, chain?: string };
        if ((!address && !jarAddress) || !chain) {
            return res.status(400).json({ error: '(Address and chain) or (jarAddress and chain) are required' });
        }

        if (address != null) {
            const jar: Jar = req.body;

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
            const operation: Operation = req.body;

            let result = await kv.get("jar:" + jarAddress + ";" + chain);
            let operations: Operation[] = [];
            if (result != null) {
                // Ensure result is an array or initialize it as an empty array
                operations = Array.isArray(result) ? result : [];
            }

            await kv.set("jar:" + jarAddress + ";" + chain, [operation, ...operations]);

            // Respond with the created jar
            res.status(200).json(operation);
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}