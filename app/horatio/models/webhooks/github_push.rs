// Incoming webhook from GitHub when code is pushed to a repository
// Route: POST /api/webhooks/github/push
// Headers: X-Hub-Signature-256, Content-Type: application/json
// #[buildamp_webhook(path = "/api/webhooks/github/push")] // TODO: Implement buildamp_webhook attribute
pub struct GitHubPushWebhook {
    pub ref_name: String,                    // "refs/heads/main" (JSON: "ref")
    pub before: String,                      // Previous commit SHA
    pub after: String,                       // New commit SHA  
    pub created: bool,                       // true if new branch
    pub deleted: bool,                       // true if branch deleted
    pub forced: bool,                        // true if force push
    pub commits: Vec<GitHubCommit>,          // Array of commit objects
    pub repository: GitHubRepository,        // Repository info
    pub pusher: GitHubUser,                  // Who pushed the code
    pub sender: GitHubUser,                  // GitHub user who triggered event
}

pub struct GitHubCommit {
    pub id: String,                          // Commit SHA: "abc123def456..."
    pub tree_id: String,                     // Tree SHA
    pub distinct: bool,                      // Is this commit new to this branch?
    pub message: String,                     // "Fix authentication bug"
    pub timestamp: String,                   // "2024-01-15T14:30:00Z"
    pub url: String,                         // GitHub commit URL
    pub author: GitHubAuthor,                // Commit author
    pub committer: GitHubAuthor,             // Committer (often same as author)
    pub added: Vec<String>,                  // Added file paths
    pub removed: Vec<String>,                // Removed file paths  
    pub modified: Vec<String>,               // Modified file paths
}

pub struct GitHubRepository {
    pub id: i64,                             // 12345678
    pub name: String,                        // "my-app"
    pub full_name: String,                   // "username/my-app"
    pub private: bool,                       // true if private repo
    pub html_url: String,                    // "https://github.com/username/my-app"
    pub clone_url: String,                   // "https://github.com/username/my-app.git"
    pub default_branch: String,              // "main"
    pub master_branch: Option<String>,       // "main" (legacy field)
}

pub struct GitHubUser {
    pub name: String,                        // "John Doe"
    pub email: String,                       // "john@example.com"
    pub username: String,                    // "johndoe" (GitHub username)
}

pub struct GitHubAuthor {
    pub name: String,                        // "John Doe"
    pub email: String,                       // "john@example.com"
    pub username: String,                    // "johndoe"
}