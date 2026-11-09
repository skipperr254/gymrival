import type { Database } from "@/types/supabase";

export type { Tables } from "@/types/supabase";

type Functions = Database["public"]["Functions"];

/**
 * One row of a set-returning RPC, e.g. `RpcRow<"global_leaderboard">`.
 *
 * The type generator marks every RPC output column non-null, even where the
 * SQL can return NULL. Mappers must keep their `?? null` guards.
 */
export type RpcRow<F extends keyof Functions> = Functions[F]["Returns"] extends (infer R)[]
  ? R
  : never;
