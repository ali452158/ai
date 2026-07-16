import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface GitHubRequest {
  action:
    | "user"
    | "user-repos"
    | "repo"
    | "repo-issues"
    | "create-issue"
    | "search-repos"
    | "search-code"
    | "repo-readme"
    | "repo-languages"
    | "my-repos";
  token?: string;
  username?: string;
  owner?: string;
  repo?: string;
  query?: string;
  state?: "open" | "closed" | "all";
  sort?: "created" | "updated" | "comments";
  per_page?: number;
  // For create-issue
  title?: string;
  body?: string;
  labels?: string[];
}

const GITHUB_API = "https://api.github.com";

function authHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "CodeMentor-App",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GitHubRequest;

    if (!body.action) {
      return NextResponse.json({ error: "action مطلوب" }, { status: 400 });
    }

    // Actions that require authentication
    const requiresAuth = ["my-repos", "create-issue"];
    if (requiresAuth.includes(body.action) && !body.token) {
      return NextResponse.json(
        { error: "GitHub token مطلوب لهذا الإجراء" },
        { status: 400 }
      );
    }

    switch (body.action) {
      case "user": {
        if (!body.username) {
          return NextResponse.json({ error: "username مطلوب" }, { status: 400 });
        }
        const res = await fetch(`${GITHUB_API}/users/${encodeURIComponent(body.username)}`, {
          headers: authHeaders(body.token),
        });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.message || "المستخدم غير موجود" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          user: {
            login: data.login,
            name: data.name,
            avatar: data.avatar_url,
            bio: data.bio,
            company: data.company,
            blog: data.blog,
            location: data.location,
            email: data.email,
            followers: data.followers,
            following: data.following,
            publicRepos: data.public_repos,
            publicGists: data.public_gists,
            createdAt: data.created_at,
            htmlUrl: data.html_url,
            type: data.type,
          },
        });
      }

      case "user-repos": {
        const username = body.username || "";
        if (!username) {
          return NextResponse.json({ error: "username مطلوب" }, { status: 400 });
        }
        const per_page = Math.min(body.per_page || 30, 100);
        const sort = body.sort || "updated";
        const url = `${GITHUB_API}/users/${encodeURIComponent(
          username
        )}/repos?per_page=${per_page}&sort=${sort}`;
        const res = await fetch(url, { headers: authHeaders(body.token) });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.message || "فشل جلب المستودعات" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          repos: (data || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            description: r.description,
            url: r.html_url,
            stars: r.stargazers_count,
            forks: r.forks_count,
            watchers: r.watchers_count,
            openIssues: r.open_issues_count,
            language: r.language,
            defaultBranch: r.default_branch,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            topics: r.topics || [],
            isPrivate: r.private,
            isFork: r.fork,
          })),
        });
      }

      case "my-repos": {
        // Authenticated user's repos
        const per_page = Math.min(body.per_page || 30, 100);
        const sort = body.sort || "updated";
        const url = `${GITHUB_API}/user/repos?per_page=${per_page}&sort=${sort}&affiliation=owner,collaborator,organization_member`;
        const res = await fetch(url, { headers: authHeaders(body.token) });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.message || "فشل جلب مستودعاتك" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          repos: (data || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            description: r.description,
            url: r.html_url,
            stars: r.stargazers_count,
            forks: r.forks_count,
            openIssues: r.open_issues_count,
            language: r.language,
            defaultBranch: r.default_branch,
            updatedAt: r.updated_at,
            isPrivate: r.private,
            permissions: r.permissions,
          })),
        });
      }

      case "repo": {
        if (!body.owner || !body.repo) {
          return NextResponse.json({ error: "owner و repo مطلوبان" }, { status: 400 });
        }
        const url = `${GITHUB_API}/repos/${encodeURIComponent(body.owner)}/${encodeURIComponent(body.repo)}`;
        const res = await fetch(url, { headers: authHeaders(body.token) });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.message || "المستودع غير موجود" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          repo: {
            id: data.id,
            name: data.name,
            fullName: data.full_name,
            description: data.description,
            url: data.html_url,
            homepage: data.homepage,
            stars: data.stargazers_count,
            forks: data.forks_count,
            watchers: data.watchers_count,
            openIssues: data.open_issues_count,
            language: data.language,
            defaultBranch: data.default_branch,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            pushedAt: data.pushed_at,
            size: data.size,
            topics: data.topics || [],
            license: data.license?.name,
            isPrivate: data.private,
            isFork: data.fork,
            isArchived: data.archived,
            owner: {
              login: data.owner?.login,
              avatar: data.owner?.avatar_url,
              type: data.owner?.type,
            },
          },
        });
      }

      case "repo-issues": {
        if (!body.owner || !body.repo) {
          return NextResponse.json({ error: "owner و repo مطلوبان" }, { status: 400 });
        }
        const state = body.state || "open";
        const per_page = Math.min(body.per_page || 30, 100);
        const sort = body.sort || "created";
        const url = `${GITHUB_API}/repos/${encodeURIComponent(body.owner)}/${encodeURIComponent(
          body.repo
        )}/issues?state=${state}&per_page=${per_page}&sort=${sort}`;
        const res = await fetch(url, { headers: authHeaders(body.token) });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.message || "فشل جلب المسائل" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          issues: (data || [])
            .filter((i: any) => !i.pull_request) // Filter out PRs
            .map((i: any) => ({
              number: i.number,
              title: i.title,
              body: i.body?.substring(0, 500),
              state: i.state,
              user: {
                login: i.user?.login,
                avatar: i.user?.avatar_url,
              },
              labels: (i.labels || []).map((l: any) => ({
                name: l.name,
                color: l.color,
              })),
              comments: i.comments,
              createdAt: i.created_at,
              updatedAt: i.updated_at,
              url: i.html_url,
            })),
        });
      }

      case "create-issue": {
        if (!body.owner || !body.repo || !body.title) {
          return NextResponse.json(
            { error: "owner و repo و title مطلوبة" },
            { status: 400 }
          );
        }
        const url = `${GITHUB_API}/repos/${encodeURIComponent(body.owner)}/${encodeURIComponent(
          body.repo
        )}/issues`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            ...authHeaders(body.token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: body.title,
            body: body.body || "",
            labels: body.labels || [],
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.message || "فشل إنشاء المسألة" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          issue: {
            number: data.number,
            title: data.title,
            body: data.body,
            state: data.state,
            url: data.html_url,
            createdAt: data.created_at,
            user: {
              login: data.user?.login,
              avatar: data.user?.avatar_url,
            },
          },
        });
      }

      case "search-repos": {
        if (!body.query) {
          return NextResponse.json({ error: "query مطلوب" }, { status: 400 });
        }
        const per_page = Math.min(body.per_page || 20, 100);
        const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(
          body.query
        )}&per_page=${per_page}&sort=stars&order=desc`;
        const res = await fetch(url, { headers: authHeaders(body.token) });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.message || "فشل البحث" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          totalCount: data.total_count,
          repos: (data.items || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            description: r.description,
            url: r.html_url,
            stars: r.stargazers_count,
            forks: r.forks_count,
            language: r.language,
            updatedAt: r.updated_at,
            topics: r.topics || [],
            owner: {
              login: r.owner?.login,
              avatar: r.owner?.avatar_url,
            },
          })),
        });
      }

      case "search-code": {
        if (!body.query) {
          return NextResponse.json({ error: "query مطلوب" }, { status: 400 });
        }
        if (!body.token) {
          return NextResponse.json(
            { error: "GitHub token مطلوب للبحث في الأكواد" },
            { status: 400 }
          );
        }
        const per_page = Math.min(body.per_page || 20, 100);
        const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(
          body.query
        )}&per_page=${per_page}`;
        const res = await fetch(url, { headers: authHeaders(body.token) });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.message || "فشل البحث في الأكواد" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          totalCount: data.total_count,
          results: (data.items || []).map((c: any) => ({
            name: c.name,
            path: c.path,
            url: c.html_url,
            repo: {
              name: c.repository?.full_name,
              url: c.repository?.html_url,
            },
            owner: {
              login: c.repository?.owner?.login,
              avatar: c.repository?.owner?.avatar_url,
            },
          })),
        });
      }

      case "repo-readme": {
        if (!body.owner || !body.repo) {
          return NextResponse.json({ error: "owner و repo مطلوبان" }, { status: 400 });
        }
        const url = `${GITHUB_API}/repos/${encodeURIComponent(body.owner)}/${encodeURIComponent(
          body.repo
        )}/readme`;
        const res = await fetch(url, {
          headers: { ...authHeaders(body.token), Accept: "application/vnd.github.raw" },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return NextResponse.json(
            { error: errData.message || "لا يوجد README" },
            { status: res.status }
          );
        }
        const readme = await res.text();
        return NextResponse.json({
          readme,
          length: readme.length,
        });
      }

      case "repo-languages": {
        if (!body.owner || !body.repo) {
          return NextResponse.json({ error: "owner و repo مطلوبان" }, { status: 400 });
        }
        const url = `${GITHUB_API}/repos/${encodeURIComponent(body.owner)}/${encodeURIComponent(
          body.repo
        )}/languages`;
        const res = await fetch(url, { headers: authHeaders(body.token) });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.message || "فشل جلب اللغات" },
            { status: res.status }
          );
        }
        const total = Object.values(data).reduce(
          (sum: number, v: any) => sum + v,
          0
        );
        const languages = Object.entries(data).map(([name, bytes]) => ({
          name,
          bytes: bytes as number,
          percentage: total > 0 ? (((bytes as number) / total) * 100).toFixed(2) : "0",
        }));
        return NextResponse.json({
          languages,
          totalBytes: total,
        });
      }

      default:
        return NextResponse.json({ error: "action غير مدعوم" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[github] Error:", err);
    return NextResponse.json(
      { error: `خطأ في GitHub API: ${err?.message || "غير معروف"}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "GitHub API Integration",
    actions: ["user", "user-repos", "repo", "repo-issues", "create-issue", "search-repos", "search-code", "repo-readme", "repo-languages", "my-repos"],
    publicActions: ["user", "user-repos", "repo", "repo-issues", "search-repos", "repo-readme", "repo-languages"],
    privateActions: ["my-repos", "create-issue", "search-code"],
  });
}
