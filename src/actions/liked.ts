"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Types
type ContentType = "movie" | "tv";
type FilterType = ContentType | "all";

export interface LikedItem {
  id: number;
  type: ContentType;
  adult?: boolean;
  backdrop_path?: string | null;
  poster_path?: string | null;
  release_date?: string;
  title: string;
  vote_average?: number;
}

export interface LikedEntry extends LikedItem {
  user_id: string;
  created_at: string;
}

interface ActionResponse<T = any> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

interface LikedResponse extends ActionResponse<LikedEntry[]> {
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  hasNextPage?: boolean;
}

interface CheckLikedResponse extends ActionResponse {
  isLiked: boolean;
}

/**
 * Add item to liked
 */
export async function addToLiked(item: LikedItem): Promise<ActionResponse<LikedEntry>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "You must be logged in to like items",
      };
    }

    if (!item.id || !item.type || !item.title) {
      return {
        success: false,
        error: "Missing required fields",
      };
    }

    if (!["movie", "tv"].includes(item.type)) {
      return {
        success: false,
        error: 'Invalid content type. Must be "movie" or "tv"',
      };
    }

    const { data, error } = await supabase
      .from("liked")
      .insert({
        user_id: user.id,
        id: item.id,
        type: item.type,
        adult: item.adult || false,
        backdrop_path: item.backdrop_path || "",
        poster_path: item.poster_path || null,
        release_date: item.release_date || new Date().toISOString().split("T")[0],
        title: item.title,
        vote_average: item.vote_average || 0,
      })
      .select()
      .single<LikedEntry>();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error: "This item is already liked",
        };
      }
      return {
        success: false,
        error: "Failed to add item to liked",
      };
    }

    revalidatePath("/library");

    return {
      success: true,
      data,
      message: "Added to liked successfully",
    };
  } catch (error) {
    console.error("Error in addToLiked:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Remove item from liked
 */
export async function removeFromLiked(id: number, type: ContentType): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "You must be logged in to remove items from liked",
      };
    }

    const { error } = await supabase
      .from("liked")
      .delete()
      .match({
        user_id: user.id,
        id: id,
        type: type,
      });

    if (error) {
      return {
        success: false,
        error: "Failed to remove item from liked",
      };
    }

    revalidatePath("/library");

    return {
      success: true,
      message: "Removed from liked successfully",
    };
  } catch (error) {
    console.error("Error in removeFromLiked:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Remove all items from liked
 */
export async function removeAllLiked(type?: FilterType): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "You must be logged in to remove items from liked",
      };
    }

    let query = supabase.from("liked").delete().match({ user_id: user.id });

    if (type && type !== "all") {
      query = query.match({ type });
    }

    const { error } = await query;

    if (error) {
      return {
        success: false,
        error: "Failed to remove items from liked",
      };
    }

    revalidatePath("/library");

    return {
      success: true,
      message: "Removed items from liked successfully",
    };
  } catch (error) {
    console.error("Error in removeAllLiked:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Check if item is in liked
 */
export async function checkInLiked(id: number, type: ContentType): Promise<CheckLikedResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: true,
        isLiked: false,
      };
    }

    const { data, error } = await supabase
      .from("liked")
      .select("id")
      .match({
        user_id: user.id,
        id: id,
        type: type,
      })
      .maybeSingle();

    if (error) {
      return {
        success: false,
        isLiked: false,
        error: "Failed to check liked status",
      };
    }

    return {
      success: true,
      isLiked: !!data,
    };
  } catch (error) {
    console.error("Error in checkInLiked:", error);
    return {
      success: false,
      isLiked: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get user's liked items with pagination
 */
export async function getLiked(
  filter: FilterType = "all",
  page: number = 1,
  limit: number = 20
): Promise<LikedResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "You must be logged in to view liked items",
      };
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from("liked")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    if (filter !== "all") {
      query = query.eq("type", filter);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return {
        success: false,
        error: "Failed to fetch liked items",
      };
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;

    return {
      success: true,
      data: data as LikedEntry[],
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage,
    };
  } catch (error) {
    console.error("Error in getLiked:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

