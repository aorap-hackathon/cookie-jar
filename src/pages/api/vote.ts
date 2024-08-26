import { kv } from '@vercel/kv';
import { NextApiRequest, NextApiResponse } from 'next';
import { Operation, Jar, Vote } from '../../lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === 'POST') {
    let { jarAddress, address, id, isUpvote, chain } = req.query as {
      jarAddress?: string;
      address?: string;
      id?: number;
      isUpvote?: string;
      chain?: string;
    };

    if (!jarAddress || !address || !id || !isUpvote || !chain) {
      return res.status(400).json({
        error:
          'jarAddress, address, id, isUpvote, chain arguments are required',
      });
    }

    const isUpvoteBool = isUpvote === 'true';

    let result = await kv.get('jar:' + jarAddress + ';' + chain);
    let operations: Operation[] = [];
    if (result != null) {
      operations = Array.isArray(result) ? result : [];
    }
    // return res.status(200).json(operations);

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      if (operation.id == id && operation.isDeposit == false) {
        const votes = operation.votes;
        let fnd = false;
        for (let j = 0; j < votes.length; j++) {
          const vote = votes[j];
          if (vote.user == address) {
            vote.isUpvote = isUpvoteBool;
            fnd = true;
          }
        }
        if (!fnd) {
          votes.push({ user: address, isUpvote: isUpvoteBool });
        }
        let score = 0;
        for (let j = 0; j < votes.length; j++) {
          if (votes[j].isUpvote == true) score += 1;
          else score -= 1;
        }
        operations[i].score = score;
      }
    }

    await kv.set('jar:' + jarAddress + ';' + chain, operations);

    // Respond with the created jar
    res.status(200).json(operations);
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
