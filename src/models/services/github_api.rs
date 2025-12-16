// Outgoing service calls to GitHub REST API
// Base URL: https://api.github.com
// Headers: Authorization: token {github_token}, Accept: application/vnd.github.v3+json

// Get commit details from GitHub API
// GET /repos/{owner}/{repo}/commits/{sha}
// #[buildamp_service(path = "/repos/{owner}/{repo}/commits/{sha}")] // TODO: Implement buildamp_service attribute
pub struct GetCommitRequest {
    pub owner: String,                       // Repository owner: "username"
    pub repo: String,                        // Repository name: "my-app" 
    pub sha: String,                         // Commit SHA: "abc123def456..."
}

pub struct GetCommitResponse {
    pub sha: String,                         // "abc123def456..."
    pub node_id: String,                     // "C_kwDOABCDEFoAKGFiYzEyM..."
    pub commit: CommitDetails,               // Detailed commit information
    pub url: String,                         // API URL for this commit
    pub html_url: String,                    // GitHub web URL for this commit
    pub comments_url: String,                // API URL for commit comments
    pub author: Option<GitHubApiUser>,       // GitHub user who authored (if they have account)
    pub committer: Option<GitHubApiUser>,    // GitHub user who committed
    pub parents: Vec<CommitParent>,          // Parent commit(s)
    pub stats: CommitStats,                  // File change statistics
    pub files: Vec<CommitFile>,              // Files changed in this commit
}

pub struct CommitDetails {
    pub message: String,                     // "Fix authentication bug\n\nUpdated OAuth flow"
    pub author: CommitAuthor,                // Git author info
    pub committer: CommitAuthor,             // Git committer info  
    pub tree: TreeInfo,                      // Git tree SHA and URL
    pub url: String,                         // API URL for commit details
    pub comment_count: i32,                  // Number of comments on commit
    pub verification: CommitVerification,    // GPG signature verification
}

pub struct CommitAuthor {
    pub name: String,                        // "John Doe"
    pub email: String,                       // "john@example.com"
    pub date: String,                        // "2024-01-15T14:30:00Z"
}

pub struct GitHubApiUser {
    pub login: String,                       // "johndoe"
    pub id: i64,                             // 12345678
    pub node_id: String,                     // "MDQ6VXNlcjEyMzQ1Njc4"
    pub avatar_url: String,                  // "https://avatars.githubusercontent.com/u/12345678"
    pub gravatar_id: Option<String>,         // Gravatar ID (usually null)
    pub url: String,                         // API URL for user
    pub html_url: String,                    // "https://github.com/johndoe"
    pub user_type: String,                   // "User" or "Organization" (JSON: "type")
    pub site_admin: bool,                    // true if GitHub admin
}

pub struct CommitParent {
    pub sha: String,                         // Parent commit SHA
    pub url: String,                         // API URL for parent commit
    pub html_url: String,                    // GitHub web URL for parent
}

pub struct TreeInfo {
    pub sha: String,                         // Tree SHA
    pub url: String,                         // API URL for tree
}

pub struct CommitVerification {
    pub verified: bool,                      // true if GPG signature valid
    pub reason: String,                      // "valid", "invalid", "unsigned", etc.
    pub signature: Option<String>,           // GPG signature (if present)
    pub payload: Option<String>,             // Signed payload (if present)
}

pub struct CommitStats {
    pub additions: i32,                      // Lines added
    pub deletions: i32,                      // Lines deleted  
    pub total: i32,                          // Total changes (additions + deletions)
}

pub struct CommitFile {
    pub filename: String,                    // "src/auth.rs"
    pub status: String,                      // "added", "modified", "removed", "renamed"
    pub additions: i32,                      // Lines added to this file
    pub deletions: i32,                      // Lines deleted from this file
    pub changes: i32,                        // Total changes to this file
    pub blob_url: String,                    // GitHub blob URL for file
    pub raw_url: String,                     // Raw file URL
    pub contents_url: String,                // API URL for file contents
    pub patch: Option<String>,               // Git diff patch (if text file)
    pub previous_filename: Option<String>,   // Original filename (if renamed)
}

// Get repository information 
// GET /repos/{owner}/{repo}
// #[buildamp_service(path = "/repos/{owner}/{repo}")] // TODO: Implement buildamp_service attribute
pub struct GetRepositoryRequest {
    pub owner: String,                       // Repository owner
    pub repo: String,                        // Repository name
}

pub struct GetRepositoryResponse {
    pub id: i64,                             // Repository ID
    pub node_id: String,                     // GraphQL node ID
    pub name: String,                        // "my-app"
    pub full_name: String,                   // "username/my-app"  
    pub description: Option<String>,         // Repository description
    pub private: bool,                       // true if private
    pub html_url: String,                    // "https://github.com/username/my-app"
    pub clone_url: String,                   // "https://github.com/username/my-app.git"
    pub git_url: String,                     // "git://github.com/username/my-app.git"
    pub ssh_url: String,                     // "git@github.com:username/my-app.git"
    pub default_branch: String,              // "main"
    pub language: Option<String>,            // Primary language: "Rust"
    pub stargazers_count: i32,               // Number of stars
    pub watchers_count: i32,                 // Number of watchers
    pub forks_count: i32,                    // Number of forks
    pub open_issues_count: i32,              // Open issues + PRs
    pub created_at: String,                  // "2024-01-01T10:00:00Z"
    pub updated_at: String,                  // "2024-01-15T14:30:00Z"
    pub pushed_at: String,                   // "2024-01-15T14:30:00Z"
    pub owner: GitHubApiUser,                // Repository owner info
}