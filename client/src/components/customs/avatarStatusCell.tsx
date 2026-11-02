import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocketContext } from "@/contexts/socketContext";
import type { UserInterface } from "@/interfaces/User";

interface AvatarWithStatusCellProps {
  user: UserInterface;
}

export const getInitials = (user: Pick<UserInterface, "forename" | "name">) =>
  `${user.forename?.[0] ?? ""}${user.name?.[0] ?? ""}`.toUpperCase() || "?";

export const AvatarWithStatusCell = ({ user }: AvatarWithStatusCellProps) => {
  const { onlineUsers } = useSocketContext();
  const isOnline = onlineUsers.includes(user._id);

  return (
    <div className="relative w-10 h-10">
      <Avatar className="w-10 h-10">
        <AvatarImage src={user.avatar} alt="User Avatar" className="object-cover object-center w-full h-full rounded-full" />
        <AvatarFallback className="bg-accent/15 font-display text-sm font-bold text-accent">{getInitials(user)}</AvatarFallback>
      </Avatar>
      <div
        className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-background rounded-full ${isOnline ? "bg-success" : "bg-gray-400"}`}
      />
    </div>
  );
};
