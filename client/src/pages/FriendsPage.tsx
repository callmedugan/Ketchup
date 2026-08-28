import PageContainer from "./PageContainer";
import FriendsSplitView from "../components/friends/FriendsSplitView";

export function FriendsPage() {
	/* ========================================================================= */
	//                        page
	/* ========================================================================= */

	return (
		<PageContainer title="Your friends" description="See who's free to hang out.">
			<FriendsSplitView />
		</PageContainer>
	);
}
