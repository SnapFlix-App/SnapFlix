"use client";

import { getWatchlist, removeAllWatchlist } from "@/actions/library";
import { getLiked, removeAllLiked } from "@/actions/liked";
import { queryClient } from "@/app/providers";
import BackToTopButton from "@/components/ui/button/BackToTopButton";
import ContentTypeSelection from "@/components/ui/other/ContentTypeSelection";
import useDiscoverFilters from "@/hooks/useDiscoverFilters";
import useSupabaseUser from "@/hooks/useSupabaseUser";
import { isEmpty } from "@/utils/helpers";
import { Trash } from "@/utils/icons";
import { addToast, Button, Select, SelectItem, Spinner } from "@heroui/react";
import { useDisclosure, useInViewport } from "@mantine/hooks";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import MoviePosterCard from "../Movie/Cards/Poster";
import TvShowPosterCard from "../TV/Cards/Poster";
import { getLoadingLabel } from "@/utils/movies";
import { ITEMS_PER_PAGE } from "@/utils/constants";
import ConfirmationModal from "@/components/ui/overlay/ConfirmationModal";
import Link from "next/link";
import { TbFolder } from "react-icons/tb";
import { BsBookmarkFill } from "react-icons/bs";
import { IoHeart } from "react-icons/io5";

type SortOption = "title" | "release_date" | "vote_average" | "created_at";
type FilterType = "movie" | "tv" | "all";
type LibraryTab = "watchlist" | "liked";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "release_date", label: "Release Date" },
  { key: "vote_average", label: "Rating" },
  { key: "created_at", label: "Date Added" },
];

const LibraryList = () => {
  const { ref, inViewport } = useInViewport();
  const { content } = useDiscoverFilters();
  const { data: user, isLoading: isUserLoading } = useSupabaseUser();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<LibraryTab>("watchlist");
  const [sortOption, setSortOption] = useState<SortOption>("created_at");
  const [opened, { open, close }] = useDisclosure(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, refetch } =
    useInfiniteQuery({
      queryKey: [activeTab, content, user?.id],
      queryFn: async ({ pageParam = 1 }) => {
        if (!user) return { success: true, data: [], hasNextPage: false };
        if (activeTab === "liked") {
          return await getLiked(content as FilterType, pageParam, ITEMS_PER_PAGE);
        }
        return await getWatchlist(content as FilterType, pageParam, ITEMS_PER_PAGE);
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.hasNextPage) {
          return pages.length + 1;
        }
        return undefined;
      },
      enabled: !isUserLoading,
      staleTime: 1000 * 60 * 5,
    });

  useEffect(() => {
    if (inViewport && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inViewport]);

  const clearMutation = useMutation({
    mutationFn: async (type: "movie" | "tv") => {
      if (!user) throw new Error("User not authenticated");
      const result =
        activeTab === "liked"
          ? await removeAllLiked(type)
          : await removeAllWatchlist(type);
      if (!result.success) {
        throw new Error(result.error || `Failed to clear ${activeTab}`);
      }
      const allItems = data?.pages.flatMap((page) => page.data || []) || [];
      const count = allItems.filter((item) => item.type === type).length;
      return { type, count };
    },
    onSuccess: ({ type, count }) => {
      queryClient.invalidateQueries({ queryKey: [activeTab] });

      addToast({
        title: `Cleared ${count} ${type === "movie" ? "movies" : "TV shows"} from your ${
          activeTab === "liked" ? "liked list" : "watchlist"
        }!`,
        color: "success",
        icon: <Trash />,
      });

      close();
    },
    onError: (error) => {
      addToast({
        title: "Error",
        description: `Failed to clear ${activeTab}. Please try again.`,
        color: "danger",
      });
      console.error(`Clear ${activeTab} error:`, error);
    },
  });

  const sortedItems = useMemo(() => {
    if (!data?.pages) return [];

    const allItems = data.pages.flatMap((page) => page.data || []);

    return [...allItems].sort((a, b) => {
      switch (sortOption) {
        case "vote_average":
        case "release_date":
          return (b[sortOption] ?? 0) > (a[sortOption] ?? 0) ? 1 : -1;
        case "created_at":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "title":
        default:
          return (a.title || "").localeCompare(b.title || "");
      }
    });
  }, [data?.pages, sortOption]);

  const confirmClear = () => {
    startTransition(() => {
      clearMutation.mutate(content);
    });
  };

  if (status === "error") {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-danger">Failed to load {activeTab}</p>
        <Button color="primary" onPress={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  const hasItems = !isEmpty(sortedItems);

  return (
    <>
      <div className="relative flex flex-col gap-6 md:gap-8">
        {/* Header with Title, Count badge, and Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-balance text-white sm:text-3xl md:text-4xl">
                  My library
                </h1>
              </div>
              {hasItems && (
                <span className="text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {sortedItems.length} {sortedItems.length === 1 ? "item" : "items"}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Your saved {content === "movie" ? "movies" : "TV shows"}, watchlist, and liked favorites
            </p>

            {/* Tab selection: Watchlist vs Liked */}
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setActiveTab("watchlist")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition ${
                  activeTab === "watchlist"
                    ? "bg-[#E50914] text-white shadow-md shadow-red-600/30"
                    : "bg-[#202020] text-gray-400 hover:text-white hover:bg-[#282828]"
                }`}
              >
                <BsBookmarkFill size={13} />
                Watchlist
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("liked")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition ${
                  activeTab === "liked"
                    ? "bg-[#E50914] text-white shadow-md shadow-red-600/30"
                    : "bg-[#202020] text-gray-400 hover:text-white hover:bg-[#282828]"
                }`}
              >
                <IoHeart size={14} />
                Liked
              </button>
            </div>
          </div>

          {/* Action buttons (Clear button on tablet/desktop/TV) */}
          {hasItems && (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                startContent={<Trash />}
                color="danger"
                variant="flat"
                size="sm"
                className="font-medium text-xs md:text-sm"
                onPress={() => {
                  if (user) open();
                }}
                isLoading={clearMutation.isPending || isPending}
              >
                Clear {activeTab === "liked" ? "Liked" : "Watchlist"}
              </Button>
            </div>
          )}
        </div>

        {/* Responsive Toolbar: Switcher & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-[#181818]/60 p-2 sm:p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
          {/* Switcher */}
          <div className="flex justify-center sm:justify-start">
            <ContentTypeSelection />
          </div>

          {/* Sort & Mobile Clear Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
            <div className="w-full sm:w-44">
              <Select
                aria-label="Sort by"
                placeholder="Sort by"
                size="sm"
                selectedKeys={[sortOption]}
                className="w-full"
                classNames={{
                  trigger: "bg-[#202020] border border-white/10 hover:border-white/20 min-h-10 h-10",
                  value: "text-xs sm:text-sm font-medium",
                }}
                onChange={({ target }) => {
                  if (target.value) setSortOption(target.value as SortOption);
                }}
              >
                {SORT_OPTIONS.map(({ key, label }) => (
                  <SelectItem key={key}>{label}</SelectItem>
                ))}
              </Select>
            </div>

            {hasItems && (
              <div className="sm:hidden shrink-0">
                <Button
                  isIconOnly
                  aria-label={`Clear ${activeTab}`}
                  color="danger"
                  variant="flat"
                  size="md"
                  className="min-h-10 min-w-10 h-10 w-10"
                  onPress={() => {
                    if (user) open();
                  }}
                  isLoading={clearMutation.isPending || isPending}
                >
                  <Trash />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic content rendering based on data availability */}
        {hasItems ? (
          <div className="relative min-h-[500px]">
            <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 md:grid-cols-4 md:gap-x-4 md:gap-y-6 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {sortedItems.map((item) => (
                <Suspense
                  key={`${item.id}-${item.type}-${item.created_at}`}
                  fallback={
                    <div className="flex h-full min-h-[200px] w-full items-center justify-center">
                      <Spinner size="sm" label={getLoadingLabel()} />
                    </div>
                  }
                >
                  {item.type === "movie" ? (
                    <MoviePosterCard movie={item as any} />
                  ) : (
                    <TvShowPosterCard tv={item as any} />
                  )}
                </Suspense>
              ))}
            </div>

            {/* InViewport anchor with infinite scroll spinner */}
            <div ref={ref} className="mt-8 flex justify-center py-4">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-default-500">
                  <Spinner size="sm" />
                  <span className="text-sm">Loading more...</span>
                </div>
              )}
              {!hasNextPage && hasItems && (
                <p className="text-xs text-default-400">
                  You have reached the end of your {activeTab}.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-default-100 p-6 text-default-400">
              {activeTab === "liked" ? <IoHeart size={48} /> : <TbFolder size={48} />}
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-lg font-semibold text-white">
                No {content === "movie" ? "movies" : content === "tv" ? "TV series" : "items"} found in{" "}
                {activeTab}
              </h3>
              <p className="text-xs text-gray-400">
                {activeTab === "liked"
                  ? `Tap the heart icon on any ${content === "movie" ? "movie" : "TV series"} to mark it as liked.`
                  : `Discover and add ${content === "movie" ? "movies" : "TV series"} to your personal watchlist to watch them anytime.`}
              </p>
            </div>
            <Button
              as={Link}
              href={content === "movie" ? "/movie" : "/tv"}
              color="primary"
              variant="flat"
              size="sm"
              className="mt-2 text-xs sm:text-sm font-medium"
            >
              Discover {content === "movie" ? "Movies" : "TV Series"}
            </Button>
          </div>
        )}
      </div>

      <BackToTopButton />

      <ConfirmationModal
        title={`Clear ${content === "movie" ? "Movies" : "TV Shows"}?`}
        isOpen={opened}
        onClose={close}
        onConfirm={confirmClear}
        confirmLabel="Clear All"
        isLoading={clearMutation.isPending}
      >
        <p>
          Are you sure you want to remove all {content === "movie" ? "movies" : "TV shows"} from
          your {activeTab}? This action cannot be undone.
        </p>
        <p className="text-default-500 text-sm">
          {sortedItems.length} {sortedItems.length === 1 ? "item" : "items"} will be
          removed.
        </p>
      </ConfirmationModal>
    </>
  );
};

export default LibraryList;
