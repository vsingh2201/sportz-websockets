import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/db.js';
import { commentary } from '../db/schema.js';
import { matchIdParamSchema } from '../validation/matches.js';
import { createCommentarySchema, listCommentaryQuerySchema } from '../validation/commentary.js';

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

commentaryRouter.get('/', async (req, res) => {
    const parsedParams = matchIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return res.status(400).json({ error: 'Invalid match ID.', details: JSON.stringify(parsedParams.error.issues) });
    }

    const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
        return res.status(400).json({ error: 'Invalid query.', details: JSON.stringify(parsedQuery.error.issues) });
    }

    const limit = Math.min(Number(parsedQuery.data.limit ?? MAX_LIMIT), MAX_LIMIT);

    try {
        const data = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, parsedParams.data.id))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        res.json({ data });
    } catch (e) {
        res.status(500).json({ error: 'Failed to list commentary.', details: JSON.stringify(e) });
    }
});

commentaryRouter.post('/', async (req, res) => {
    const parsedParams = matchIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return res.status(400).json({ error: 'Invalid match ID.', details: JSON.stringify(parsedParams.error.issues) });
    }

    const parsedBody = createCommentarySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json({ error: 'Invalid payload.', details: JSON.stringify(parsedBody.error.issues) });
    }

    try {
        const [entry] = await db
            .insert(commentary)
            .values({
                matchId: parsedParams.data.id,
                ...parsedBody.data,
            })
            .returning();

        if(res.app.locals.broadcastCommentary){
            res.app.locals.broadcastCommentary(entry.matchId, entry);
        }


        res.status(201).json({ data: entry });
    } catch (e) {
        res.status(500).json({ error: 'Failed to create commentary.', details: JSON.stringify(e) });
    }
});