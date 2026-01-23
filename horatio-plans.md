* add event to hard delete soft deleted data > 30 days
* add sse for new comment: load on item page
* add 'removed' switch on comment, only visible in admin edit form, that intercepts comment text with moderation message. server sends empty text: client gives consistent message when removed.
* add sse for removed comment: update on item page
* extension: enrich content with: tiptap owner comment, html of selection
* test deeply nested comments
* multi-admin with edit queue;
  - project key + initial host required to claim editor role (where to store?)
  - admin key per host set by editor, required for admin (where to store?)
* upgrade visitor id
  - visitors can become authenticated users with real IDs
