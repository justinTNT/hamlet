DONE:
* add event to hard delete soft deleted data > 30 days
* add sse for new comment: load on item page
* add 'removed' switch on comment, only visible in admin edit form, that intercepts comment text with moderation message. server sends empty text: client gives consistent message when removed.
* add sse for removed comment: update on item page
  - note: app could subscribe to certain events (e.g. comment.removed changed) and admin could publish those subscribed events to app's queue. keeps business logic (SSE broadcast) in app's event handlers, admin stays generic CRUD. simple config like `{ table = "item_comment", field = "removed", event = "CommentModerated" }`
* test deeply nested comments

TODO:
* extension: enrich content with: tiptap owner comment, html of selection
* expand Admin hooks 
* implement task_abstraction_proposal.md
* multi-admin with edit queue;
  - project key + initial host required to claim editor role (where to store?)
  - admin key per host set by editor, required for admin (where to store?)
* upgrade visitor id
  - upgrade automated non-authenticated session id
  - visitors can become authenticated users with real IDs
  - email workflow
  - cognito workflow
