import { serve } from "https://deno.land/std@0.173.0/http/server.ts";

const port = Number(Deno.env.get("PORT")) || 8080;
const token = (Deno.env.get("TOKEN") || await Deno.readTextFile(".token")).trim();

if (token.length == 0) {
  throw "Github API token required!";
}

const index = await Deno.readTextFile("index.html");
const FILTERED_COMMITS = ["60536c52210a7891a4dc8cda4aa150c0af4e8e39"];

let lastOctoCache: { value: string; timestamp: Date } | null = null;

async function getLastCommit(now: Date) {
  try {
    console.info("Fetching octo data...");
    type Commit = { sha: string; commit: { committer: { date: string } } };

    const response = await fetch(
      "https://api.github.com/repos/uclaacm/lactf-challenges-2023/commits?author=bliutech&per_page=4",
      {
        headers: {
          "Authorization": "Bearer " + token,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    const lastCommit = (await (response.json() as Promise<Commit[]>))
      .filter((x) => !FILTERED_COMMITS.includes(x.sha))
      .sort((a, b) =>
        new Date(b.commit.committer.date).valueOf() -
        new Date(a.commit.committer.date).valueOf()
      )[0];

    return Math.round(
      (now.valueOf() -
        new Date(lastCommit.commit.committer.date).valueOf()) / 86400000,
    ).toString();
  } catch (e) {
    console.error("Exception while fetching octo data:", e)
    return "?";
  }
}

const handler = async (_request: Request): Promise<Response> => {
  const now = new Date();
  if (
    lastOctoCache === null ||
    lastOctoCache.timestamp.valueOf() - now.valueOf() > 300000
  ) {
    lastOctoCache = { value: await getLastCommit(now), timestamp: now };
  }
  const body = index.replaceAll("{DAYS}", lastOctoCache.value);
  return new Response(body, {
    status: 200,
    headers: [["Content-Type", "text/html; charset=utf-8"]],
  });
};

await serve(handler, { port });
