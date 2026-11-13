"use client";

import { useEffect, useState, useTransition } from "react";
import { IoHeart, IoHeartOutline } from "react-icons/io5";
import { addToast } from "@heroui/react";
import IconButton from "./IconButton";
import { Trash } from "@/utils/icons";
import useDeviceVibration from "@/hooks/useDeviceVibration";
import useSupabaseUser from "@/hooks/useSupabaseUser";
import { SavedMovieDetails } from "@/types/movie";
import { addToLiked, removeFromLiked, checkInLiked } from "@/actions/liked";
import { queryClient } from "@/app/providers";
import { usePathname } from "next/navigation";

interface LikeButtonProps {
  data: SavedMovieDetails;
  isTooltipDisabled?: boolean;
  className?: string;
}

const LikeButton: React.FC<LikeButtonProps> = ({ data, isTooltipDisabled, className }) => {
  const pathname = usePathname();
  const { startVibration } = useDeviceVibration();
  const { data: user } = useSupabaseUser();
  const [isPending, startTransition] = useTransition();
  const [isLiked, setIsLiked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkLikedStatus = async () => {
      if (!user) {
        setIsChecking(false);
        setIsLiked(false);
        return;
      }

      setIsChecking(true);
      try {
        const result = await checkInLiked(data.id, data.type);
        if (result.success) {
          setIsLiked(result.isLiked);
        }
      } catch (error) {
        console.error("Error checking liked status:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkLikedStatus();
  }, [user, data.id, data.type]);

  const handleLike = () => {
    if (!user) {
      addToast({
        title: "You must be logged in to like items",
        color: "warning",
      });
      return;
    }

    startTransition(async () => {
      try {
        if (isLiked) {
          const result = await removeFromLiked(data.id, data.type);

          if (result.success) {
            setIsLiked(false);

            addToast({
              title: `${data.title} removed from liked!`,
              color: "danger",
              icon: <Trash />,
            });

            if (pathname.startsWith("/library")) {
              queryClient.invalidateQueries({ queryKey: ["liked"] });
            }
          } else {
            addToast({
              title: "Error",
              description: result.error || "Failed to remove from liked",
              color: "danger",
            });
          }
        } else {
          const likedItem = {
            id: data.id,
            type: data.type,
            adult: data.adult,
            backdrop_path: data.backdrop_path,
            poster_path: data.poster_path || null,
            release_date: data.release_date,
            title: data.title,
            vote_average: data.vote_average,
          };

          const result = await addToLiked(likedItem);

          if (result.success) {
            setIsLiked(true);
            startVibration([100]);
            addToast({
              title: `${data.title} added to liked!`,
              color: "success",
            });

            if (pathname.startsWith("/library")) {
              queryClient.invalidateQueries({ queryKey: ["liked"] });
            }
          } else {
            if (result.error === "This item is already liked") {
              setIsLiked(true);
              addToast({
                title: "Already liked",
                description: `${data.title} is already in your liked list`,
                color: "warning",
              });
            } else {
              addToast({
                title: "Error",
                description: result.error || "Failed to add to liked",
                color: "danger",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error updating liked:", error);
        addToast({
          title: "Error",
          description: "An unexpected error occurred",
          color: "danger",
        });
      }
    });
  };

  return (
    <IconButton
      onPress={handleLike}
      icon={
        isLiked ? (
          <IoHeart size={20} className="text-[#E50914] fill-[#E50914]" />
        ) : (
          <IoHeartOutline size={20} />
        )
      }
      variant={isLiked ? "shadow" : "faded"}
      color={isLiked ? "danger" : "default"}
      tooltip={isTooltipDisabled ? undefined : isLiked ? "Remove from Liked" : "Like"}
      isLoading={isPending || isChecking}
      className={className}
    />
  );
};

export default LikeButton;
