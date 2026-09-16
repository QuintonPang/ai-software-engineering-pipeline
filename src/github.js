export class GithubClient {
  constructor(token, repository) {
    this.token = token;
    this.repository = repository;
  }

  async request(path, init = {}) {
    const response = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ai-software-engineering-pipeline",
        ...(init.headers || {})
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub ${response.status}: ${body}`);
    }
    return response.json();
  }

  async getIssue(issueNumber) {
    const data = await this.request(`/repos/${this.repository}/issues/${issueNumber}`);
    return {
      number: data.number,
      title: data.title,
      body: data.body || "",
      htmlUrl: data.html_url
    };
  }

  async createPullRequest({ title, body, head, base }) {
    const data = await this.request(`/repos/${this.repository}/pulls`, {
      method: "POST",
      body: JSON.stringify({ title, body, head, base })
    });
    return { number: data.number, htmlUrl: data.html_url };
  }
}
