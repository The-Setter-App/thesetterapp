// Turns the `success` and `error` codes the team actions put in the URL into
// sentences for the Team tab.

const SUCCESS_MESSAGES: Record<string, string> = {
  member_saved: "Invite sent. They can sign in with that email.",
  role_updated: "Role updated.",
  member_removed: "Team member removed and their account deleted.",
  ownership_transferred: "Workspace ownership transferred.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  invalid_role: "Choose Setter or Closer as the role.",
  failed_to_add_member: "Could not add that team member. Try again.",
  failed_to_update_role: "Could not update that role. Try again.",
  failed_to_remove_member: "Could not remove that team member. Try again.",
  failed_to_transfer_ownership: "Could not transfer ownership. Try again.",
  // Set when a team member tries to connect Instagram or Calendly.
  owner_access_required: "Only the workspace owner can connect accounts.",
};

export function getTeamSuccessMessage(code: string): string {
  return SUCCESS_MESSAGES[code] ?? "Changes saved.";
}

// Unknown codes are messages thrown by the server, which already read as
// sentences, so they are shown as they are.
export function getTeamErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? code;
}
