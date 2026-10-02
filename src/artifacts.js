import { INCOME, money } from './answers.js'

const asset = name => new URL(`./assets/${name}`, import.meta.url).href

const SITE = {
  url: 'momo.example',
  brand: 'Momo',
  links: ['Outfits', 'Docs', 'GitHub'],
  kicker: 'Open source',
  headline: 'A helper that dresses for the job',
  subline:
    'Ask about dinner and on goes the chef’s hat. Ask about code and out comes the hard hat.',
  button: 'Try Momo',
  secondary: 'See how it works',
  rail: [
    ['cook', 'Chef'],
    ['investigate', 'Detective'],
    ['builder', 'Builder'],
    ['garden', 'Gardener'],
    ['captain', 'Captain'],
    ['tutor', 'Tutor'],
  ],
  off: 2,
}

const TRACKS = 'https://audio-ssl.itunes.apple.com/itunes-assets/'
const MUSIC = 'https://music.apple.com/gb/album/'

export const ARTIFACTS = {
  spinach: {
    kind: 'Recipe',
    icon: 'pan',
    tone: 3,
    title: 'Spinach and egg skillet',
    tabs: [
      {
        label: 'Ingredients',
        blocks: [
          {
            type: 'stats',
            items: [
              { icon: 'clock', value: '15 min', label: 'Total time' },
              { icon: 'people', value: '2', label: 'Servings' },
              { icon: 'pan', value: '1 pan', label: 'To wash' },
            ],
          },
          {
            type: 'checklist',
            groups: [
              {
                title: 'Ingredients',
                columns: 2,
                items: [
                  ['Eggs', '4'],
                  ['Spinach', '200 g'],
                  ['Butter or olive oil', '1 tbsp'],
                  ['Garlic clove, sliced', '1'],
                  ['Lemon, zest only', '½'],
                  ['Chilli flakes', 'A pinch'],
                  ['Salt and pepper'],
                  ['Toast, to serve'],
                ],
              },
            ],
          },
        ],
      },
      {
        label: 'Method',
        blocks: [
          {
            type: 'plan',
            every: 5,
            items: [
              {
                label: 'Prep',
                value: 3,
                note: 'Slice the garlic, zest the lemon, rinse the spinach.',
              },
              {
                label: 'Spinach',
                value: 4,
                note: 'Garlic in the fat, then the spinach until the pan is dry.',
              },
              {
                label: 'Eggs in',
                value: 1,
                note: 'Make four wells, crack an egg into each, season.',
              },
              {
                label: 'Lid on, low heat',
                value: 6,
                note: 'Until the whites are set. Longer for firm yolks.',
              },
              { label: 'Finish', value: 1, note: 'Lemon zest, chilli and black pepper.' },
            ],
          },
        ],
      },
    ],
  },

  charged: {
    kind: 'Diagnosis',
    icon: 'card',
    tone: 5,
    title: 'Why the card was charged twice',
    sub: 'Retries without a shared key',
    tabs: [
      {
        label: 'What happens',
        blocks: [
          {
            type: 'lanes',
            lanes: [
              {
                title: 'Today',
                result: 'Charged twice',
                items: [
                  ['card', 'Customer taps Pay'],
                  ['clock', 'The request times out'],
                  ['retry', 'The app retries with a new key', true],
                  ['card', 'The provider sees a second payment'],
                ],
              },
              {
                title: 'One key per checkout',
                good: true,
                result: 'Charged once',
                items: [
                  ['card', 'Customer taps Pay'],
                  ['clock', 'The request times out'],
                  ['retry', 'The app retries with the same key', true],
                  ['check', 'The provider returns the first result'],
                ],
              },
            ],
          },
        ],
      },
      {
        label: 'The fix',
        blocks: [
          {
            type: 'code',
            lang: 'js',
            title: 'checkout.js',
            text: "async function pay(order) {\n  order.paymentKey ??= crypto.randomUUID()\n  await orders.save(order)\n\n  return retry(() =>\n    fetch('/v1/charges', {\n      method: 'POST',\n      headers: { 'Idempotency-Key': order.paymentKey },\n      body: JSON.stringify({ amount: order.total }),\n    }),\n  )\n}",
          },
          {
            type: 'note',
            text: 'Create the key once, save it with the order, and send the same key on every attempt.',
          },
        ],
      },
    ],
  },

  launch: {
    kind: 'Drafts',
    icon: 'pencil',
    tone: 1,
    title: 'Launch post',
    sub: 'Two versions',
    tabs: [
      {
        label: 'Plain',
        blocks: [
          {
            type: 'post',
            look: 'write',
            name: 'Momo',
            handle: '@momo',
            limit: 280,
            text: 'Meet Momo, a little helper that dresses for the job.\n\nAsk about dinner and it puts on a chef’s hat. Ask why a test is failing and out comes the monocle. Same helper, the right outfit every time.\n\nOpen source and free to try.',
          },
        ],
      },
      {
        label: 'Playful',
        blocks: [
          {
            type: 'post',
            look: 'write',
            name: 'Momo',
            handle: '@momo',
            limit: 280,
            text: 'Momo owns 16 outfits and wears every one with purpose.\n\nChef’s hat for recipes. Hard hat for code. A captain’s cap when it’s time to ship.\n\nTell it what you’re working on and watch it change. Now open source.',
          },
        ],
      },
    ],
  },

  hero: {
    kind: 'Layout',
    icon: 'layout',
    tone: 6,
    title: 'Hero, first pass',
    sub: 'Stacks on phones',
    tabs: [
      { label: 'Preview', blocks: [{ type: 'browser', ...SITE }] },
      {
        label: 'Anatomy',
        blocks: [
          { type: 'browser', ...SITE, pins: true },
          {
            type: 'legend',
            notes: [
              ['Kicker', 'One or two words of context.'],
              ['Headline', 'What it is, in under ten words.'],
              ['Supporting line', 'Who it’s for, or how it works.'],
              ['One button', 'A quieter text link can sit beside it.'],
              ['The product', 'The real thing, not a stock photo.'],
            ],
          },
        ],
      },
      {
        label: 'Code',
        blocks: [
          {
            type: 'code',
            lang: 'html',
            title: 'hero.html',
            text: '<section class="hero">\n  <p class="kicker">Open source</p>\n  <h1>A helper that dresses for the job</h1>\n  <p>Ask about dinner and on goes the chef’s hat.</p>\n  <a class="button" href="/try">Try Momo</a>\n  <ul class="rail" aria-label="Outfits">\n    <li><img src="chef.webp" alt="Momo in a chef’s hat" /></li>\n    <li aria-current="true">\n      <img src="builder.webp" alt="Momo in a hard hat" />\n    </li>\n    <li><img src="captain.webp" alt="Momo in a captain’s cap" /></li>\n  </ul>\n</section>',
          },
        ],
      },
    ],
  },

  focus: {
    kind: 'Playlist',
    icon: 'music',
    tone: 4,
    title: 'Focus mix',
    sub: '7 tracks, about 45 min, no vocals',
    footnote: '30-second previews from Apple Music',
    blocks: [
      {
        type: 'playlist',
        label: 'Energy rises through the middle of the mix and falls away at the end.',
        phases: [
          {
            label: 'Settle in',
            from: 0.18,
            to: 0.5,
            tracks: [
              {
                artist: 'Brian Eno',
                title: 'An Ending (Ascent)',
                ms: 266200,
                preview: `${TRACKS}AudioPreview211/v4/39/f0/83/39f083d2-f807-039c-936c-819ff0fbb225/mzaf_2664632352612945926.plus.aac.p.m4a`,
                url: `${MUSIC}an-ending-ascent/714861155?i=714861225`,
              },
              {
                artist: 'Nils Frahm',
                title: 'Says',
                ms: 498000,
                preview: `${TRACKS}AudioPreview211/v4/36/97/9c/36979c81-c97b-2323-9ada-96fa05a94785/mzaf_546068789723583981.plus.aac.p.m4a`,
                url: `${MUSIC}says/1451166665?i=1451166669`,
              },
            ],
          },
          {
            label: 'Deep work',
            from: 0.5,
            to: 0.88,
            tracks: [
              {
                artist: 'Tycho',
                title: 'Awake',
                ms: 283636,
                preview: `${TRACKS}AudioPreview211/v4/43/db/e8/43dbe8d9-eede-d066-4d44-5fce31130640/mzaf_15409472201423475078.plus.aac.p.m4a`,
                url: `${MUSIC}awake/793928184?i=793928278`,
              },
              {
                artist: 'Boards of Canada',
                title: 'Dayvan Cowboy',
                ms: 300187,
                preview: `${TRACKS}AudioPreview211/v4/1b/0c/a7/1b0ca75a-5047-d624-6319-2f5e4206cb8b/mzaf_7586392779972207949.plus.aac.p.m4a`,
                url: `${MUSIC}dayvan-cowboy/81696254?i=81696232`,
              },
              {
                artist: 'Jon Hopkins',
                title: 'Open Eye Signal',
                ms: 468587,
                preview: `${TRACKS}AudioPreview211/v4/2d/13/3e/2d133e69-8319-a1a0-8168-416cb8c95ad7/mzaf_9406132645104516608.plus.aac.p.m4a`,
                url: `${MUSIC}open-eye-signal-remaster-2023/1688995695?i=1688995997`,
              },
            ],
          },
          {
            label: 'Land',
            from: 0.88,
            to: 0.14,
            tracks: [
              {
                artist: 'Explosions in the Sky',
                title: 'Your Hand in Mine',
                ms: 497493,
                preview: `${TRACKS}AudioPreview125/v4/ca/92/50/ca925016-22ad-949d-f118-38c7b95409c0/mzaf_13412167902317015403.plus.aac.p.m4a`,
                url: `${MUSIC}your-hand-in-mine/671801566?i=671802270`,
              },
              {
                artist: 'Max Richter',
                title: 'On the Nature of Daylight',
                ms: 371747,
                preview: `${TRACKS}AudioPreview211/v4/85/ec/31/85ec3121-880e-8d05-70ee-a3f5cad67d29/mzaf_13875593167782602175.plus.aac.p.m4a`,
                url: `${MUSIC}on-the-nature-of-daylight/1368089903?i=1368090483`,
              },
            ],
          },
        ],
      },
    ],
  },

  dns: {
    kind: 'Explainer',
    icon: 'globe',
    tone: 6,
    title: 'Looking up example.com',
    sub: 'Five hops, then cached',
    blocks: [
      {
        type: 'flow',
        nodes: [
          { glyph: 'www', label: 'Browser', text: 'Checks its own cache first' },
          { glyph: '1.1.1.1', label: 'Resolver', text: 'Your provider’s, or a public one' },
          { glyph: '.', label: 'Root server', text: 'Knows who runs .com' },
          { glyph: '.com', label: 'TLD server', text: 'Points to the nameservers' },
          { glyph: 'NS', label: 'Nameserver', text: 'Replies with the IP address' },
        ],
      },
      {
        type: 'note',
        text: 'The resolver keeps the answer for its time to live, so the next lookup skips straight to the end.',
      },
    ],
  },

  basil: {
    kind: 'Plant check',
    icon: 'leaf',
    tone: 3,
    title: 'What’s wrong with my basil?',
    sub: 'Check the soil first, then pick what you see',
    blocks: [
      {
        type: 'picker',
        question: 'What do you see?',
        groups: [
          {
            label: 'Droopy? Feel the soil',
            options: [
              {
                icon: 'drop',
                label: 'Soil is dry',
                cause: 'Thirst',
                fix: 'Water slowly at the base until it runs out of the bottom.',
              },
              {
                icon: 'waves',
                label: 'Soil is wet',
                cause: 'Too much water',
                fix: 'Let it dry out, empty the saucer and check the pot drains.',
              },
            ],
          },
          {
            label: 'Or do you see',
            options: [
              {
                icon: 'sun',
                label: 'Droops in hot afternoon sun',
                cause: 'Heat',
                fix: 'Move it to morning sun with some shade later in the day.',
              },
              {
                icon: 'snow',
                label: 'Dark leaves after a cold night',
                cause: 'Cold',
                fix: 'Move it somewhere warm, away from cold glass at night.',
              },
            ],
          },
        ],
      },
    ],
  },

  greytext: {
    kind: 'Contrast check',
    icon: 'contrast',
    tone: 4,
    title: 'Grey text on white',
    sub: 'Three common greys, checked for WCAG AA',
    blocks: [
      {
        type: 'contrast',
        bg: '#FFFFFF',
        text: 'Updated just now',
        subtext: 'Tap to see changes',
        samples: [
          { fg: '#B0B0B8', label: 'Light grey' },
          { fg: '#8E8E96', label: 'Mid grey' },
          { fg: '#6B6B73', label: 'Dark grey' },
        ],
      },
      {
        type: 'note',
        text: 'Large text means at least 24px, or about 18.5px bold. Anything smaller needs 4.5:1.',
      },
    ],
  },

  hook: {
    kind: 'Storyboard',
    icon: 'film',
    tone: 2,
    title: '30-second cut',
    sub: '5 beats',
    blocks: [
      {
        type: 'storyboard',
        track: 'Video',
        frames: [
          { seconds: 3, title: 'Hook', text: '“Your notes are everywhere. Watch this.”' },
          { seconds: 5, title: 'Problem', text: 'Two quick cuts of the mess getting worse.' },
          { seconds: 12, title: 'The fix', text: 'The product sorts it in one continuous move.' },
          { seconds: 6, title: 'Proof', text: 'The calm result, or one real number.' },
          { seconds: 4, title: 'Name', text: 'Logo, one line and where to get it.' },
        ],
      },
    ],
  },

  workout: {
    kind: 'Workout',
    icon: 'flame',
    tone: 5,
    title: 'Bodyweight circuit',
    sub: 'No kit needed',
    tabs: [
      {
        label: 'Plan',
        blocks: [
          {
            type: 'stats',
            items: [
              { icon: 'clock', value: '20 min', label: 'Total' },
              { icon: 'retry', value: '3', label: 'Rounds' },
              { icon: 'flame', value: '40 / 20 s', label: 'Work / rest' },
            ],
          },
          {
            type: 'plan',
            every: 5,
            items: [
              {
                label: 'Warm up',
                value: 3,
                dim: true,
                note: 'March on the spot, arm circles, a few easy squats.',
              },
              { label: 'Round 1', value: 5 },
              { label: 'Round 2', value: 5 },
              { label: 'Round 3', value: 5 },
              {
                label: 'Cool down',
                value: 2,
                dim: true,
                note: 'Walk it off, then stretch calves and hips.',
              },
            ],
          },
        ],
      },
      {
        label: 'Moves',
        blocks: [
          {
            type: 'moves',
            title: 'One round, in this order',
            toggle: 'Easier versions',
            rhythm: 'Repeat 3 times, with 20 s rest after each move',
            items: [
              {
                figure: 'squat',
                name: 'Squats',
                cue: 'Sit back, chest up',
                easier: 'Squat down to a chair',
                time: '40 s',
              },
              {
                figure: 'pushup',
                name: 'Push-ups',
                cue: 'Body in one straight line',
                easier: 'Hands on a wall or table',
                time: '40 s',
              },
              {
                figure: 'lunge',
                name: 'Reverse lunges',
                cue: 'Step back, knee towards the floor',
                easier: 'Hold a chair for balance',
                time: '40 s',
              },
              {
                figure: 'plank',
                name: 'Plank',
                cue: 'Hips level, keep breathing',
                easier: 'Knees down',
                time: '40 s',
              },
              {
                figure: 'jack',
                name: 'Jumping jacks',
                cue: 'Light on your feet',
                easier: 'Step out instead of jumping',
                time: '40 s',
              },
            ],
          },
        ],
      },
    ],
  },

  packing: {
    kind: 'Packing list',
    icon: 'suitcase',
    tone: 1,
    title: '3 days in Lisbon',
    chips: ['October', 'Carry-on only'],
    cover: {
      src: asset('lisbon.webp'),
      alt: 'A yellow funicular climbing a cobbled street in Lisbon',
      credit: 'Photo: André Lergier, Unsplash',
      href: 'https://unsplash.com/photos/anrBiSm4iFQ',
      position: '50% 38%',
    },
    blocks: [
      {
        type: 'facts',
        items: [
          { icon: 'plug', tone: 2, label: 'Sockets, 230 V', value: 'Type C and F' },
          { icon: 'euro', tone: 3, label: 'Currency', value: 'Euro' },
          { icon: 'drop', tone: 6, label: 'Tap water', value: 'Treated to EU standards' },
          { icon: 'tram', tone: 4, label: 'Transport', value: 'Trams, metro, walking' },
        ],
      },
      {
        type: 'checklist',
        inline: true,
        groups: [
          {
            title: 'Wear',
            tone: 1,
            items: [['Shoes with grip'], ['Light jacket'], ['Sunglasses']],
          },
          {
            title: 'Pack',
            tone: 2,
            items: [['Tops', '3'], ['Nicer outfit'], ['Swimwear'], ['Sunscreen']],
          },
          {
            title: 'Carry',
            tone: 3,
            items: [
              ['Plug adapter'],
              ['Refillable bottle'],
              ['Card that works abroad'],
              ['Passport or ID'],
            ],
          },
        ],
      },
    ],
  },

  budget: {
    kind: 'Budget',
    icon: 'pie',
    tone: 1,
    title: `Splitting ${money(INCOME)} a month`,
    sub: 'After tax, using the 50/30/20 rule',
    views: [
      ['bar', 'Bar'],
      ['pie', 'Pie'],
    ],
    blocks: [
      {
        type: 'split',
        total: INCOME,
        changed: 'After tax, using a {split} split',
        items: [
          { label: 'Needs', share: 50, note: 'Rent, bills, groceries, transport' },
          { label: 'Wants', share: 30, note: 'Eating out, hobbies, subscriptions' },
          { label: 'Savings and debt', share: 20, note: 'Emergency fund first' },
        ],
      },
    ],
  },

  booktable: {
    kind: 'Booking',
    icon: 'fork',
    tone: 1,
    title: 'Booking request',
    sub: 'Draft, not booked yet',
    tabs: [
      {
        label: 'Request',
        blocks: [
          {
            type: 'pass',
            kicker: 'Table request',
            status: 'Draft',
            title: 'Table for four',
            fields: [
              ['pin', 'Where', 'Alfama, Lisbon'],
              ['calendar', 'Day', 'This Friday'],
              ['clock', 'Time', '7:30 pm'],
              ['people', 'Party', '4 people'],
            ],
          },
        ],
      },
      {
        label: 'Message',
        blocks: [
          {
            type: 'bubble',
            copy: 'Copy message',
            text: 'Hi, could I book a table for four this Friday at 7:30? Anywhere between 7:00 and 8:00 works. [Any allergies or needs.] Thanks, [your name].',
          },
        ],
      },
      {
        label: 'Next steps',
        blocks: [
          {
            type: 'steps',
            items: [
              ['Find three places nearby', 'Open on Friday evening, with tables for four.'],
              ['Ask for 7:30', 'And accept anything from 7:00 to 8:00.'],
              ['Send the request', 'Through their booking page, or the message above.'],
              ['Add it to your calendar', 'With the address and a reminder that morning.'],
            ],
          },
        ],
      },
    ],
  },

  shippr: {
    kind: 'Release plan',
    icon: 'branch',
    tone: 3,
    title: 'Shipping the sign-up branch',
    sub: 'From sign-up into main',
    tabs: [
      {
        label: 'Steps',
        blocks: [
          {
            type: 'steps',
            gate: 4,
            items: [
              ['Review the diff', 'So nothing unexpected ships with it.'],
              ['Run the tests', 'Anything red stops the whole thing here.'],
              ['Commit', 'One message that explains why.'],
              ['Push and open a pull request', 'As a draft, with how it was tested.'],
              ['Wait for your OK', 'No merge and no deploy until you say so.'],
            ],
          },
        ],
      },
      {
        label: 'Terminal',
        blocks: [
          {
            type: 'code',
            lang: 'sh',
            title: 'Terminal',
            text: 'git status\ngit diff --stat\nnpm test\ngit add -A\ngit commit -m "Check the email format before sign-up"\ngit push -u origin sign-up\ngh pr create --fill --draft',
          },
        ],
      },
    ],
  },

  signuptests: {
    kind: 'Test plan',
    icon: 'flask',
    tone: 4,
    title: 'Sign-up test plan',
    sub: '6 cases, Playwright',
    tabs: [
      {
        label: 'Cases',
        blocks: [
          {
            type: 'table',
            columns: ['Case', 'Try', 'Expect'],
            rows: [
              {
                icon: 'check',
                name: 'Valid sign-up',
                try: 'A new email and a strong password',
                expect: 'Lands on the welcome page',
              },
              {
                icon: 'mail',
                name: 'Bad email',
                try: 'name@',
                mono: true,
                expect: 'An error under the email field, nothing sent',
              },
              {
                icon: 'lock',
                name: 'Short password',
                try: 'Seven characters',
                expect: 'Says how long it needs to be',
              },
              {
                icon: 'user',
                name: 'Email taken',
                try: 'An existing account’s email',
                expect: 'Offers to sign in instead',
              },
              {
                icon: 'pointer',
                name: 'Double click',
                try: 'Sign up, clicked twice',
                expect: 'Only one account is created',
              },
              {
                icon: 'keyboard',
                name: 'Keyboard only',
                try: 'Tab through, press Enter',
                expect: 'Every field and the button reachable',
              },
            ],
          },
        ],
      },
      {
        label: 'First test',
        blocks: [
          {
            type: 'code',
            lang: 'js',
            title: 'sign-up.spec.ts',
            text: "import { test, expect } from '@playwright/test'\n\ntest('a bad email shows an error and does not submit', async ({ page }) => {\n  await page.goto('/sign-up')\n  await page.getByLabel('Email').fill('name@')\n  await page.getByLabel('Password').fill('correct horse battery')\n  await page.getByRole('button', { name: 'Sign up' }).click()\n\n  await expect(page.getByText('Enter a valid email')).toBeVisible()\n  await expect(page).toHaveURL(/sign-up/)\n})",
          },
        ],
      },
    ],
  },

  deletelogs: {
    kind: 'Approval',
    icon: 'trash',
    title: 'Delete logs older than 30 days',
    sub: 'Waiting for you',
    tabs: [
      {
        label: 'Plan',
        blocks: [
          {
            type: 'alert',
            title: 'This can’t be undone',
            text: 'Deleted logs are gone for good, so nothing runs until you say yes.',
          },
          {
            type: 'chips',
            items: [
              { icon: 'folder', text: './logs', mono: true },
              { icon: 'clock', text: 'Older than 30 days' },
            ],
          },
          {
            type: 'steps',
            danger: 2,
            items: [
              ['Dry run', 'List the matching files and their total size.'],
              ['You check the list', 'Anything you want to keep comes out.'],
              ['Delete, after your yes', 'Only files older than 30 days.'],
              ['Stop it happening again', 'Rotate the logs on a schedule.'],
            ],
          },
          {
            type: 'actions',
            status: 'Nothing deleted yet',
            buttons: [{ label: 'Start the dry run', primary: true }, { label: 'Not now' }],
          },
        ],
      },
      {
        label: 'Terminal',
        blocks: [
          {
            type: 'code',
            lang: 'sh',
            title: 'Terminal',
            text: 'find ./logs -type f -mtime +30 -print\nfind ./logs -type f -mtime +30 -print0 | du -ch --files0-from=- | tail -1\n\nfind ./logs -type f -mtime +30 -delete',
          },
        ],
      },
    ],
  },

  schrodinger: {
    kind: 'Lesson',
    icon: 'book',
    tone: 6,
    title: 'Schrödinger’s cat, like you’re five',
    sub: 'A story about a cat, a box and peeking',
    credit: 'Portrait: Smithsonian Institution, no known restrictions.',
    tabs: [
      {
        label: 'Story',
        blocks: [
          {
            type: 'lesson',
            cats: {
              napping: { small: asset('cat-napping.webp'), big: asset('cat-napping-box.webp') },
              awake: { small: asset('cat-awake.webp'), big: asset('cat-awake-box.webp') },
            },
            beats: [
              { title: 'Hide', text: 'A cat hides in a box. The lid is shut.' },
              { title: 'Both', text: 'We can’t see her. Pretend she’s napping and awake!' },
              { title: 'Peek', text: 'Open the lid. Now she’s just one:' },
            ],
            again: 'Peek again',
          },
          {
            type: 'person',
            photo: asset('schrodinger.webp'),
            alt: 'Erwin Schrödinger, in a black and white photo',
            kicker: 'Who made up this story?',
            name: 'Erwin Schrödinger',
            text: 'A scientist. He told it to show that tiny, tiny things act very strangely.',
          },
          {
            type: 'note',
            text: 'For grown-ups: Erwin told this in 1935 to show how odd quantum physics looks for big things. In his version the cat is alive or not. We kept it gentle.',
          },
        ],
      },
      {
        label: 'Go further',
        blocks: [
          {
            type: 'links',
            title: 'Want more?',
            items: [
              {
                icon: 'video',
                title: 'Schrödinger’s cat: A thought experiment in quantum mechanics',
                meta: 'Video for older kids and grown-ups, TED-Ed, youtube.com',
                url: 'https://www.youtube.com/watch?v=UjaAxUO6-Uw',
              },
              {
                icon: 'user',
                title: 'Who was Erwin Schrödinger?',
                meta: 'NobelPrize.org',
                url: 'https://www.nobelprize.org/prizes/physics/1933/schrodinger/biographical/',
              },
              {
                icon: 'doc',
                title: 'The original 1935 paper',
                meta: 'For grown-ups, in German, link.springer.com',
                url: 'https://link.springer.com/article/10.1007/BF01491891',
              },
              {
                icon: 'book',
                title: 'The Copenhagen interpretation',
                meta: 'For grown-ups, Stanford Encyclopedia of Philosophy',
                url: 'https://plato.stanford.edu/entries/qm-copenhagen/',
              },
            ],
          },
          { type: 'actions', buttons: [{ label: 'Send me more resources' }] },
        ],
      },
    ],
  },
}
