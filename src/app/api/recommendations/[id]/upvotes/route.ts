// Updated route.ts file

import { NextResponse } from 'next/server';
import { getRecommendation, isUserInClique } from './helpers';

export async function upvote(req, { params }) {
    const { id } = params;
    const cliqueId = req.headers['clique-id']; // Assuming cliqueId is passed in headers
    const recommendation = await getRecommendation(id);

    // Validate clique membership
    if (!await isUserInClique(req.user.id, cliqueId)) {
        return NextResponse.json({ error: 'User is not a member of this clique.' }, { status: 403 });
    }

    // Your upvote logic here

    return NextResponse.json({ message: 'Upvoted successfully.' });
}

export async function deleteUpvote(req, { params }) {
    const { id } = params;
    const cliqueId = req.headers['clique-id']; // Assuming cliqueId is passed in headers
    const recommendation = await getRecommendation(id);

    // Check if the recommendation exists
    if (!recommendation) {
        return NextResponse.json({ error: 'Recommendation not found.' }, { status: 404 });
    }

    // Validate clique membership
    if (!await isUserInClique(req.user.id, cliqueId)) {
        return NextResponse.json({ error: 'User is not a member of this clique.' }, { status: 403 });
    }

    // Your delete logic here

    return NextResponse.json({ message: 'Upvote deleted successfully.' });
}