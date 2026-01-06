/**
 * GraphQL queries and mutations for testing
 */

export const QUERIES = {
  users: "{ users { id name email } }",
  posts: "{ posts { id title body user_id } }",
  comments: "{ comments { id body post_id user_id } }",
  userById: (id: string) => `{ user(id: "${id}") { id name email } }`,
  postById: (id: string) => `{ post(id: "${id}") { id title body user_id } }`,
  commentById: (id: string) => `{ comment(id: "${id}") { id body post_id user_id } }`,
};

export const MUTATIONS = {
  updateUser: (id: string, name: string, email: string) =>
    `mutation { updateUser(id: "${id}", name: "${name}", email: "${email}") { id name } }`,
  createPost: (title: string, userId: string) =>
    `mutation { createPost(title: "${title}", user_id: "${userId}", body: "Load test content") { id title } }`,
  deletePost: (id: string) =>
    `mutation { deletePost(id: "${id}") { id } }`,
  createComment: (postId: string, userId: string) =>
    `mutation { createComment(post_id: "${postId}", user_id: "${userId}", body: "Test comment") { id } }`,
};

export const QUERY_TYPES = ["users", "posts", "comments", "userById", "postById", "commentById"] as const;
export const MUTATION_TYPES = ["updateUser", "createPost", "deletePost", "createComment"] as const;

export type QueryType = typeof QUERY_TYPES[number];
export type MutationType = typeof MUTATION_TYPES[number];

/**
 * Get a query string for the given type and parameters
 */
export function getQuery(type: QueryType, params: { userId?: string; postId?: string; commentId?: string }): string {
  switch (type) {
    case "users":
      return QUERIES.users;
    case "posts":
      return QUERIES.posts;
    case "comments":
      return QUERIES.comments;
    case "userById":
      return QUERIES.userById(params.userId || "1");
    case "postById":
      return QUERIES.postById(params.postId || "1");
    case "commentById":
      return QUERIES.commentById(params.commentId || "1");
  }
}

/**
 * Get a mutation string for the given type and parameters
 */
export function getMutation(
  type: MutationType,
  params: { userId?: string; postId?: string; uid?: string }
): string {
  const uid = params.uid || Date.now().toString().slice(-6);
  const userId = params.userId || "1";
  const postId = params.postId || "1";

  switch (type) {
    case "updateUser":
      return MUTATIONS.updateUser(userId, `User ${uid}`, `user${uid}@test.com`);
    case "createPost":
      return MUTATIONS.createPost(`Post ${uid}`, userId);
    case "deletePost":
      return MUTATIONS.deletePost(postId);
    case "createComment":
      return MUTATIONS.createComment(postId, userId);
  }
}
