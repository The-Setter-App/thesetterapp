# Meta App Review: what to submit for each request

Work through this top to bottom. Each permission has the text to paste into
Meta's "how does your app use this" box and what the screen recording should
show. The descriptions match what Setter's code does today; if a feature
changes, update the text before reusing it.

Meta changes its forms from time to time. Where the form asks for something
this file does not cover, answer what the form asks.

## One-line description of the app

Use this wherever Meta asks what the app is:

> Setter is a shared inbox and CRM for businesses that sell through Instagram
> direct messages. A business owner connects their own Instagram professional
> account, and their team reads and answers incoming messages inside Setter,
> tracks where each lead stands, and books calls.

## Step 1: remove two requests

Delete these from the list with the bin icon. Setter does not use them, and
Meta turns down permissions an app cannot show in use.

| Request | Why it goes |
| --- | --- |
| `instagram_business_manage_messages` | Belongs to "Instagram Login". Setter connects through Facebook Login and uses `instagram_manage_messages` instead. |
| `pages_utility_messaging` | For pre-approved utility message templates. Setter sends none. |

## Step 2: before you click Next

Reviewers check these first, and a gap here gets the whole submission sent
back.

- **Business verification** is complete for the business that owns the app.
- **App settings → Basic** has an icon, a category, a privacy policy URL
  (`https://www.thesetter.app/legal-pages/privacy-policy`), a terms URL
  (`https://www.thesetter.app/legal-pages/terms-and-conditions`) and data
  deletion instructions.
- **The privacy policy mentions Instagram and Facebook data.** Today it does
  not. It needs to say what is collected (messages, usernames, profile
  pictures, comments), why, who processes it, and how to have it deleted.
- **A reviewer can sign in.** Setter signs people in with a code sent by
  email, which a reviewer cannot receive. They need an account they can get
  into, with an Instagram account already connected, and the sign-in steps
  written in the "test instructions" box.
- **A test Instagram account** exists to play the lead: it sends the messages
  and comments shown in the recordings.

## Step 3: the recordings

One recording can cover several permissions, but each permission's box must
say where in the recording it appears. For every recording:

- Start signed out, and show signing in to Setter.
- Show the whole Facebook dialog when connecting Instagram, including the
  list of permissions being granted. Do not cut it.
- Keep the interface in English and narrate with captions or a voiceover.
- Show the result on both sides: in Setter, and in the Instagram app.

Suggested recordings:

- **Recording A (connect and message).** Sign in → Settings → Instagram →
  Connect account → Facebook dialog → back in Setter the account shows by
  username. From the test Instagram account, send a message. It appears in
  Setter's inbox with the sender's name and picture. Reply from Setter. The
  reply arrives in the Instagram app.
- **Recording B (comment automation).** Settings → Instagram → New
  automation with keyword "PDF". From the test account, comment "PDF" on a
  post. The automatic message arrives in the test account's inbox.
- **Recording C (reply after 24 hours).** Open a conversation where the
  lead's last message is more than a day old. Point out the countdown in the
  header. A team member types a reply and sends it. It arrives in Instagram.

## Step 4: the requests, one by one

### 1. `instagram_manage_messages` (Recording A)

> Setter is a shared inbox for a business's Instagram direct messages. After a
> business owner connects their Instagram professional account, we use this
> permission to read that account's conversations and messages, receive new
> messages as they arrive, and send the replies the owner's team writes in
> Setter. The messages are shown only to that business's own team. Without
> this permission the inbox, which is the core of the product, cannot work.

Shown in the recording: conversations loading in the inbox, a new message
arriving, and a reply being sent and delivered.

### 2. `instagram_basic` (Recording A)

> We use this permission to read the ID and username of the Instagram
> professional account the business owner connects. Setter shows the username
> in Settings so the owner can see which account is connected, and uses the
> ID to match incoming messages to the right account when a business has
> connected more than one.

Shown in the recording: the connected account listed by username in
Settings → Instagram.

### 3. `pages_show_list` (Recording A)

> An Instagram professional account is reached through the Facebook Page it
> is linked to. We use this permission to list the Pages the person
> connecting manages, so we can find the Page linked to their Instagram
> account and connect it. We do not show or use Pages that have no Instagram
> account linked.

Shown in the recording: choosing the Page in the Facebook dialog, then the
linked Instagram account appearing in Setter.

### 4. `pages_read_engagement` (Recording A)

> We use this permission to read the Facebook Page's name and the Instagram
> professional account linked to it. That link is how Setter knows which
> Instagram account the business owner is connecting. We read no posts,
> followers or insights from the Page.

Shown in the recording: the connected account in Settings, with its Page
name under the username.

### 5. `pages_manage_metadata` (Recording A)

> We use this permission to subscribe the connected Page to our app's
> webhooks, so that new Instagram messages reach Setter the moment they are
> sent. This is what lets a business's team answer leads quickly instead of
> refreshing to check for messages. We change no other Page settings.

Shown in the recording: a message sent from the test account appearing in
Setter's inbox without the page being reloaded.

### 6. `pages_messaging` (Recording A)

> Instagram messages for a professional account are received and sent
> through its linked Facebook Page. We use this permission to subscribe to
> the Page's message events and to send the replies a business's team writes
> in Setter through the Page's messaging endpoint to Instagram. Setter has
> no way to message someone who has not first messaged the business or
> commented on its content.

Shown in the recording: the same receive-and-reply sequence as
`instagram_manage_messages`.

### 7. `business_management` (Recording A)

> Many of our customers keep their Facebook Page and Instagram account
> inside a Meta business portfolio. We use this permission so those Pages
> are available when the business owner connects Instagram to Setter.
> Without it, an owner whose Page belongs to a business portfolio cannot
> connect their account. We do not create, edit or remove anything in the
> portfolio.

Shown in the recording: connecting an Instagram account whose Page is owned
by a business portfolio. If your own Page is set up this way, Recording A
already shows it; say so in the box.

### 8. `instagram_manage_comments` (Recording B)

> Businesses use Setter's comment automations to answer people who ask for
> something in the comments. The owner sets a keyword, for example "PDF".
> When someone comments that keyword on the business's post or reel, Setter
> sends that person one private reply by direct message, with the text the
> owner wrote. We use this permission to be told about new comments on the
> business's own media and to send that private reply. We do not post,
> hide or delete comments.

Shown in the recording: creating the automation, commenting the keyword from
the test account, and the message arriving.

### 9. Human Agent (Recording C)

> Leads often message a business in the evening or at a weekend, and
> qualifying a lead for a sales call regularly takes more than one day of
> back-and-forth. We use the human agent tag so a member of the business's
> team can answer a customer's message when it could not be resolved within
> 24 hours, up to 7 days after the customer last wrote. Every tagged message
> is written or reviewed, and sent, by a person on the business's team inside
> Setter. Setter never sends tagged messages automatically, and never uses
> the tag for promotions or to start a conversation.

Shown in the recording: a conversation older than 24 hours, the countdown
showing the time left, and a person typing and sending the reply.

Note: Setter can suggest a reply for the team member to edit. Nothing is sent
until the person presses send, which is what this policy requires. If asked,
say so plainly.

### 10. Business Asset User Profile Access (Recording A)

> When a customer messages a business, we use this feature to read that
> customer's name, username and profile picture. Setter shows them beside
> the conversation so the business's team can see who they are talking to
> and tell leads apart. The details are shown only to that business's team
> and are not used for advertising or shared with anyone else.

Shown in the recording: the inbox with each conversation's name and
picture.

### 11. `public_profile`

Granted to every app by default. It normally needs no explanation. If the
form asks:

> We use the public profile only to identify the Facebook account of the
> person connecting their Page and Instagram account to Setter.

## How data is handled (for the data-handling questions)

- Data is used only to provide the inbox to the business that connected the
  account. It is not sold or used for advertising.
- Access tokens are stored encrypted.
- When an owner disconnects an Instagram account in Settings, Setter deletes
  that account's stored conversations and messages.
- Message text is sent to Anthropic to draft suggested replies, summarise
  conversations and sort leads by status. List Anthropic as a processor if
  the form asks who else handles the data.
