export const INCOME = 2400
export const money = n => n.toLocaleString('en-GB')

export const ANSWERS = {
  dns: {
    look: 'tutor',
    q: 'How does DNS work?',
    keys: /\bdns\b|domain name system/i,
    text: 'Think of DNS as the internet’s address book. Computers find each other by number, an IP address, but people remember names. DNS turns one into the other, usually before your browser has even started loading the page.\n\nIt works by asking in steps, from the most general server to the most specific, and every answer comes with a time to live that says how long it can be cached.[1] That’s why a site you opened a minute ago resolves instantly, and why a changed DNS record can take a while to reach everyone.\n\nAt the very top sit the root servers: 13 named authorities, from a to m, run by 12 different operators.[2] They don’t know where every site lives, only who to ask next, which is what keeps the whole system small enough to work.',
    sources: [
      {
        title: 'Cloudflare: What is DNS?',
        url: 'https://www.cloudflare.com/learning/dns/what-is-dns/',
      },
      { title: 'IANA: Root servers', url: 'https://www.iana.org/domains/root/servers' },
    ],
  },
  vpn: {
    look: 'tutor',
    q: 'What is a VPN and what does it do?',
    keys: /\bvpns?\b/i,
    text: 'A VPN (virtual private network) sends your internet traffic through an encrypted tunnel to a server run by the VPN company. Websites see that server’s address instead of yours, and people on the same Wi-Fi can’t read what you send. The VPN company itself can still see your traffic, so pick one you trust.',
  },
  api: {
    look: 'tutor',
    q: 'What is an API?',
    keys: /\bapis?\b/i,
    text: 'An API is the menu one program offers another. It lists the requests you can make, like “get this user” or “create an order”, and the format the answer comes back in. You don’t need to know how the kitchen works, only how to order.',
  },
  https: {
    look: 'tutor',
    q: 'What is HTTPS, and what does the padlock in the browser mean?',
    keys: /\bhttps\b|\bpadlock\b/i,
    text: 'HTTPS is the web’s normal protocol, HTTP, wrapped in encryption. The padlock means your connection to the site is encrypted and the site proved it owns its domain with a certificate. It doesn’t mean the site is trustworthy, only that nobody in between can read or change the traffic.',
  },
  cookies: {
    look: 'tutor',
    q: 'What are browser cookies?',
    keys: /\b(browser|web|website|tracking|third.party) cookies?\b|\bcookies? (in|on) (my |the )?(browser|websites?)\b|\baccept(ing)? (all )?cookies\b/i,
    text: 'Cookies are small notes a website asks your browser to keep. Each time you come back, the browser hands the note back, which is how a site remembers that you’re logged in or what’s in your cart. Third-party cookies come from other companies embedded in the page, and those are the ones used to track you across sites.',
  },
  cache: {
    look: 'tutor',
    q: 'What is a cache?',
    keys: /\bcach(e|es|ing)\b/i,
    text: 'A cache is a nearby copy of something that’s slow to fetch. Your browser keeps images and files from sites you’ve visited so the next visit loads faster. The catch is that a copy can go stale, which is why clearing the cache fixes some odd problems.',
  },
  ip: {
    look: 'tutor',
    q: 'What is an IP address?',
    keys: /\bip address(es)?\b|\bmy ip\b/i,
    text: 'An IP address is the number that identifies a device on a network, like a postal address for data. Your home router has one public address on the internet and hands out private ones to each device in the house. DNS is what turns names like example.com into these numbers.',
  },
  cloud: {
    look: 'tutor',
    q: 'What is “the cloud”?',
    keys: /\bthe cloud\b|\bcloud (computing|storage)\b/i,
    text: 'The cloud means someone else’s computers, usually in big data centres, that you use over the internet. Photos in cloud storage sit on those servers, and apps can rent computing power there instead of buying their own machines.',
  },
  ai: {
    look: 'tutor',
    q: 'How does AI like ChatGPT work?',
    keys: /\b(what is|what’s|what's|how does|how do) (an? )?(ai|chatgpt|llms?|large language models?|artificial intelligence)\b/i,
    text: 'Chat assistants run on large language models. A model is trained on huge amounts of text until it gets very good at predicting what comes next, then tuned to follow instructions and be helpful. It doesn’t look things up unless it’s given a tool to, which is why it can sound sure and still be wrong.',
  },
  git: {
    look: 'tutor',
    q: 'What is Git?',
    keys: /\bgit\b|\bgithub\b/i,
    text: 'Git keeps the full history of a project’s files. Each commit saves a snapshot you can go back to, and branches let you try changes without touching the main version. GitHub is a website that hosts Git projects so people can share and review them.',
  },
  twofa: {
    look: 'tutor',
    q: 'What is two-factor authentication?',
    keys: /\b(2fa|two.factor|mfa|multi.factor)\b/i,
    text: 'Two-factor authentication asks for a second proof after your password, usually a code from an app or a tap on your phone. Even if someone steals your password, they can’t get in without that second step. Authenticator apps and security keys are safer than codes sent by text message.',
  },
  passwords: {
    look: 'tutor',
    q: 'Should I use a password manager?',
    keys: /\bpassword managers?\b/i,
    text: 'Yes. A password manager creates a long, different password for every site and remembers them for you, so one leaked password can’t unlock everything else. You only need to remember one strong main password, and it’s worth turning on two-factor for the manager itself.',
  },
  compound: {
    look: 'tutor',
    q: 'What is compound interest?',
    keys: /\bcompound(ing)? interest\b/i,
    text: 'Compound interest is interest earned on interest. Put 1,000 away at 5% a year and you have 1,050 after a year; the next year’s 5% is worked out on 1,050, not 1,000. Over decades that snowball does most of the growing, which is why starting early matters.',
  },
  inflation: {
    look: 'tutor',
    q: 'What is inflation?',
    keys: /\binflation\b/i,
    text: 'Inflation is prices rising over time, so the same money buys a little less each year. A little is normal, and many central banks aim for around 2% a year. When it runs much higher, savings lose value quickly and people feel poorer even if their pay goes up.',
  },
  sky: {
    look: 'tutor',
    q: 'Why is the sky blue?',
    keys: /\bsky\b.*\bblue\b|\bblue sky\b/i,
    text: 'Sunlight contains every colour. As it passes through the air, tiny gas molecules scatter blue light far more than red, so blue reaches your eyes from every part of the sky. At sunset the light crosses much more air, the blue gets scattered away, and the reds and oranges are left.',
  },
  photosynthesis: {
    look: 'tutor',
    q: 'What is photosynthesis?',
    keys: /\bphotosynthesis\b/i,
    text: 'Photosynthesis is how plants make food from light. Leaves take in carbon dioxide from the air and water from the roots, and use sunlight to turn them into sugar. Oxygen is released along the way, and that’s where the oxygen we breathe comes from.',
  },
  schrodinger: {
    look: 'tutor',
    q: 'Explain Schrödinger’s cat to me like I’m five',
    keys: /schr(ö|o|oe)dinger/i,
    text: 'Imagine a cat hiding in a box with the lid shut. We can’t see her, so we don’t know if she’s napping or awake.\n\nA scientist called Erwin Schrödinger had a funny idea: until someone peeks, pretend she’s both at once.[1] When you open the box, she’s only one of them.\n\nHe made it sound silly on purpose. Really tiny things, much smaller than a speck of dust, can act like that, and he wanted people to see how strange it is.[2]',
    sources: [
      {
        title: 'Schrödinger (1935): Die gegenwärtige Situation in der Quantenmechanik',
        url: 'https://link.springer.com/article/10.1007/BF01491891',
      },
      {
        title: 'Stanford Encyclopedia of Philosophy: The Copenhagen interpretation',
        url: 'https://plato.stanford.edu/entries/qm-copenhagen/',
      },
    ],
  },
  blackhole: {
    look: 'tutor',
    q: 'What is a black hole?',
    keys: /\bblack holes?\b/i,
    text: 'A black hole is a place where so much mass is packed into so little space that nothing can escape its gravity, not even light. Many form when a very large star collapses at the end of its life. The boundary you can’t come back from is called the event horizon.',
  },

  spinach: {
    look: 'cook',
    q: 'What can I make with eggs and spinach in 15 minutes?',
    keys: /\bspinach\b/i,
    text: 'Here’s a quick one with what you have: a spinach and egg skillet. It takes about 15 minutes in one pan and feeds two.\n\nThe trick is to **cook the spinach down until the pan is dry** before the eggs go in, otherwise its water pools around them and they poach instead of setting. Then turn the heat to low and cover the pan, so the steam sets the tops while the bottoms stay tender. If the whites set before the yolks are how you like them, give it another minute with the lid on.\n\nA food safety note: the USDA advises cooking eggs until both the white and the yolk are firm.[1] If you follow that, keep the lid on for a couple of extra minutes.\n\nEasy swaps: crumble in feta at the end, spoon over yoghurt and chilli oil, or use kale if that’s what’s in the fridge.',
    sources: [
      {
        title: 'USDA: Shell eggs from farm to table',
        url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/eggs/shell-eggs-farm-table',
      },
    ],
  },
  eggs: {
    look: 'cook',
    q: 'How long do I boil an egg?',
    keys: /\bboil(ed|ing)? (an? )?eggs?\b|\beggs?\b.*\bboil/i,
    text: 'Lower eggs straight from the fridge into boiling water. 6 minutes gives a jammy yolk, 7 a soft-set one and 10 a fully hard one. Move them into cold water straight away so they stop cooking and peel more easily.',
  },
  rice: {
    look: 'cook',
    q: 'How do I cook rice?',
    keys: /\b(cook|make|boil) (white |basmati |jasmine )?rice\b|\brice\b.*\b(cook|water)\b/i,
    text: 'For white rice, rinse 1 cup until the water runs clear, then add 1½ cups of water and a pinch of salt. Bring it to a boil, cover, turn the heat right down and cook for 15 minutes. Leave it covered off the heat for 5 more, then fluff it with a fork.',
  },
  pasta: {
    look: 'cook',
    q: 'What’s a quick pasta I can make?',
    keys: /\bpasta\b|\bspaghetti\b/i,
    text: 'Try garlic and oil spaghetti. While the pasta cooks in well-salted water, warm sliced garlic and a pinch of chilli flakes in plenty of olive oil until just golden. Toss the drained pasta in the pan with a splash of the cooking water, then finish with parsley and lemon.',
  },
  pancakes: {
    look: 'cook',
    q: 'How do I make pancakes?',
    keys: /\bpancakes?\b/i,
    text: 'Whisk 1 cup of flour, 1 tablespoon of sugar, 2 teaspoons of baking powder and a pinch of salt. Add 1 cup of milk, 1 egg and 2 tablespoons of melted butter, and stir until just combined; a few lumps are fine. Cook ladlefuls in a pan on medium heat and flip when bubbles pop on top.',
  },

  charged: {
    look: 'investigate',
    q: 'Why are some customers charged twice at checkout?',
    keys: /\bcharged twice\b|\bdouble.charg/i,
    text: 'This is almost always a retry problem. A payment request is slow, the app stops waiting and tries again, and the payment provider sees two separate requests. The first one did go through, it was only slow to answer, so the card is charged twice.[1]\n\nThe fix is an **idempotency key**: a unique ID created once per checkout and sent with every attempt. When the provider sees the same key again, it returns the result of the first request instead of charging again.[2] The key has to exist before the first try and be saved with the order. If it’s generated inside the retry loop, every retry gets a new one and the double charges come back.\n\nTo confirm it, look for two charges on the same order a few seconds apart, with a timeout logged between them.',
    sources: [
      {
        title: 'Stripe: Designing APIs with idempotency',
        url: 'https://stripe.com/blog/idempotency',
      },
      {
        title: 'Stripe docs: Idempotent requests',
        url: 'https://docs.stripe.com/api/idempotent_requests',
      },
    ],
  },
  cors: {
    look: 'investigate',
    q: 'Why am I getting a CORS error?',
    keys: /\bcors\b/i,
    text: 'A CORS error means the browser blocked your page from reading a response from another site, because that server didn’t say your site is allowed. The fix belongs on the server: send an Access-Control-Allow-Origin header that names your site. Or call the API from your own backend, where CORS doesn’t apply.',
  },
  notfound: {
    look: 'investigate',
    q: 'Why do I get a 404 error?',
    keys: /\b404\b|\bpage not found\b/i,
    text: 'A 404 means the server was reached but has nothing at that address. Usually the link has a typo, the page was moved or deleted, or the capital letters don’t match. If it’s your own site, check the file path and any redirect rules, then reload without the cache.',
  },
  slownet: {
    look: 'investigate',
    q: 'Why is my internet or Wi-Fi so slow?',
    keys: /\b(wi.?fi|internet|connection)\b.*\bslow\b|\bslow\b.*\b(wi.?fi|internet|connection)\b/i,
    text: 'Run a speed test next to the router, then in the room where it’s slow. If it’s only slow far away, the Wi-Fi signal is the problem, so move the router higher and into the open. If it’s slow everywhere, restart the router, and if that doesn’t help, ask your provider whether there’s an outage.',
  },
  crash: {
    look: 'investigate',
    q: 'Why does my app keep crashing?',
    keys: /\b(app|phone|program|game|laptop)\b.*\bcrash\w*|\bcrash\w*\b.*\b(app|program|game)\b/i,
    text: 'First make the crash happen on purpose and note exactly what you did just before it closed. Update the app and your phone or computer, then restart. If it still crashes, reinstall the app; if it only fails on one screen, that detail is what to send the developer.',
  },

  launch: {
    look: 'write',
    q: 'Write a short launch post for Momo',
    keys: /\blaunch post\b/i,
    text: 'Here are two drafts, one plain and one with a bit more personality. Both lead with what Momo does before what it is, because people scroll past announcements but stop for something they can picture.\n\nKeep the first line short enough to read in a preview, and post it with a few seconds of Momo changing outfit. The clip does the explaining, so the words can stay light. If you only have room for one, use the plain version: it says what Momo is in the first sentence.',
  },
  apology: {
    look: 'write',
    q: 'Write an apology email',
    keys: /\bapolog/i,
    text: 'Here’s a draft:\n\nHi [name],\n\nI’m sorry about [what went wrong]. That shouldn’t have happened, and I understand how frustrating it was. We’ve [fixed it or refunded you], and we’re [changing what caused it] so it doesn’t happen again.\n\nThanks for your patience,\n[your name]',
  },
  coldemail: {
    look: 'write',
    q: 'Write a cold email to someone I don’t know',
    keys: /\bcold (email|message|outreach)\b/i,
    text: 'Keep it short enough to read on a phone:\n\nHi [name], I’m [you], and I [one line on what you do]. I noticed [something specific about their work]. Would you be open to a 15-minute call next week about [topic]? Either way, thanks for reading.\n\n[your name]',
  },
  bio: {
    look: 'write',
    q: 'Write a short bio about me',
    keys: /\b(short|my|a|professional) bio\b|\babout me (section|page)\b/i,
    text: 'A short bio that works almost anywhere:\n\n“[Name] is a [role] who helps [who] [do what]. Before that, [one past thing]. Outside work, [one human detail].”\n\nUse the third person for websites and talks, and the first person for social profiles.',
  },
  thankyou: {
    look: 'write',
    q: 'Write a thank-you note',
    keys: /\bthank.you (note|card|message|email|letter)\b/i,
    text: 'Here’s a short one:\n\nThank you so much for [the gift or help]. It meant a lot, especially [one specific detail]. I’m already [how you’re using it or what it changed]. Hope to see you soon.\n\nThe specific detail is what makes it feel personal.',
  },

  hero: {
    look: 'builder',
    q: 'Build a landing page hero for the Momo launch',
    keys: /\blanding page\b|\bhero section\b/i,
    text: 'On it. A hero has one job: in a few seconds a visitor should know what this is and what to do next. So I’d keep it to **one headline, one supporting line and one button**, with the real product as the picture.\n\nHere’s the layout I’d build first, then check at phone and desktop widths. Two details matter more than they look. Keep the headline as real text, not part of an image, so it shows up straight away and screen readers can read it. And give the hero image its width, height and a high fetch priority, because it’s usually the largest thing on screen and decides how fast the page feels.\n\nBoth matter because the hero gets most of the attention: Nielsen Norman Group found people spend about 57% of their page-viewing time above the fold,[1] and Google counts a Largest Contentful Paint of 2.5 seconds or less as good.[2]',
    sources: [
      {
        title: 'NN/g: Scrolling and attention',
        url: 'https://www.nngroup.com/articles/scrolling-and-attention/',
      },
      { title: 'web.dev: Largest Contentful Paint', url: 'https://web.dev/articles/lcp' },
    ],
  },
  learncode: {
    look: 'builder',
    q: 'How do I start learning to code?',
    keys: /\b(learn|start|begin)\w* (to )?(code|coding|programming)\b/i,
    text: 'Pick one small thing you actually want to make, like a personal page or a tiny game, and learn only what it needs. HTML, CSS and JavaScript run in any browser, so you can start today with no setup. Build a little every day; finishing small projects teaches more than long courses.',
  },
  portfolio: {
    look: 'builder',
    q: 'How do I make a portfolio website?',
    keys: /\bportfolio\b/i,
    text: 'Keep it to three parts: one line on what you do, three to five of your best projects with a short story for each, and an easy way to contact you. Leave out weaker work, because quality beats quantity. A simple site builder is fine; the projects are what people look at.',
  },

  focus: {
    look: 'music',
    q: 'Make me a 45 minute focus playlist',
    keys: /\bfocus\b.*\b(playlist|music|mix)\b|\b(playlist|music|mix)\b.*\bfocus\b/i,
    text: 'Here’s a focus mix of about 45 minutes, built in three stretches. It starts quiet so you can settle in, lifts in the middle while you’re deepest in the work, then lands softly so the end doesn’t jolt you out of it.\n\nEverything is instrumental, so there are no lyrics pulling at your attention. Keep the volume low enough that you’d still hear someone say your name. If a track grabs you, skip it: a focus mix works best when you stop noticing it. Put it on shuffle and you lose the shape, so play it in order.',
  },
  workoutmix: {
    look: 'music',
    q: 'Make me a workout playlist',
    keys: /\b(workout|gym|running|run)\b.*\b(playlist|music|songs|mix)\b|\b(playlist|music|songs|mix)\b.*\b(workout|gym|running)\b/i,
    text: 'Build it like the workout: two or three mid-tempo songs to warm up, then a long run of high-energy tracks around 120 to 140 beats per minute, and one or two slower songs to cool down. Put your favourite song where you usually feel like stopping.',
  },
  sleep: {
    look: 'music',
    q: 'What should I listen to for sleep?',
    keys: /\bsleep\b.*\b(music|sounds?|listen|playlist)\b|\b(music|sounds?|listen\w*|playlist)\b.*\bsleep\b/i,
    text: 'Go for slow, steady sounds with no lyrics: ambient music, soft piano, rain or brown noise. Set a sleep timer so it stops after 30 to 60 minutes, and keep the volume low enough that it fades into the background.',
  },

  basil: {
    look: 'garden',
    q: 'My basil is wilting, what do I do?',
    keys: /\bbasil\b/i,
    text: 'Wilting basil can mean opposite things, so **check the soil before you reach for the watering can**. Push a finger about 2 cm into the compost. If it’s dry, the plant is thirsty and usually perks up within a few hours of a good drink. If it’s wet, more water is the last thing it needs: the roots are sitting in soggy compost and can’t breathe.\n\nBasil also hates cold and damp. The RHS calls it a tender plant and suggests it only goes outside once nights stay above 10°C,[1] so a chilly windowsill can make it sulk even when the watering is right. Water in the morning rather than at night, because it hates sitting in wet compost overnight.\n\nOnce it recovers, pinch out the top pair of leaves on each stem. It grows bushier instead of tall and leggy, and you get to eat the tips.',
    sources: [
      { title: 'RHS: How to grow basil', url: 'https://www.rhs.org.uk/herbs/basil/grow-your-own' },
    ],
  },
  yellow: {
    look: 'garden',
    q: 'Why are my plant’s leaves turning yellow?',
    keys: /\byellow(ing)? leaves\b|\bleaves\b.*\byellow/i,
    text: 'Yellow leaves most often mean too much water. Push a finger into the soil: if it’s still damp a few centimetres down, wait until it dries before watering again, and make sure the pot drains. If the soil is bone dry, it’s thirst instead. An old lower leaf yellowing now and then is normal.',
  },
  succulents: {
    look: 'garden',
    q: 'How do I look after succulents or cacti?',
    keys: /\bsucculents?\b|\bcact(us|i)\b/i,
    text: 'Give them lots of light and very little water. Water deeply only when the soil is completely dry, often every two to three weeks, and use a pot with a drainage hole and gritty soil. Soft, mushy leaves mean too much water; wrinkled ones mean they’re thirsty.',
  },
  tomatoes: {
    look: 'garden',
    q: 'How do I grow tomatoes?',
    keys: /\bgrow\w* tomato(es)?\b|\btomato plants?\b/i,
    text: 'Tomatoes want at least six hours of direct sun a day. Plant them deep in a big pot or bed after the last frost, water at the base so the soil stays evenly moist, and tie them to a stake as they grow. Once flowers appear, a tomato feed every week or two helps the fruit.',
  },
  repot: {
    look: 'garden',
    q: 'When should I repot a plant?',
    keys: /\brepot\w*/i,
    text: 'Repot when roots poke out of the drainage holes or water runs straight through. Go up only one pot size, a few centimetres wider, with fresh soil, and do it in spring when the plant is growing. Water well afterwards and keep it out of harsh sun for a week.',
  },

  fontpair: {
    look: 'designer',
    q: 'Pick a font pairing for a calm app',
    keys: /\bfont pair(ing)?s?\b|\bpair(ing)? (of )?fonts\b/i,
    text: 'Try Inter for the interface and Fraunces for headings. Inter stays clear at small sizes, and Fraunces adds warmth without shouting. Use two weights of each, and let size and spacing do the rest.',
  },
  greytext: {
    look: 'designer',
    q: 'Is light grey text on white readable enough?',
    keys: /\bgr[ae]y text\b|\btext contrast\b|\bcontrast ratio\b/i,
    text: 'Probably not, if it’s the very light grey a lot of interfaces use. Readability comes down to contrast: how far apart the brightness of the text and the background are. The accessibility standard most teams follow, WCAG, asks for at least **4.5 to 1** for body text and **3 to 1** for large text.[1]\n\nI checked three common greys against white below, and you can check your own with WebAIM’s free tool.[2] The lightest one looks elegant in a mockup but fails for body text, and it only gets worse on a phone in sunlight. Keep very light greys for things nobody has to read, like dividers, and use the darkest of the three for anything that carries meaning, including placeholder text and captions.',
    sources: [
      {
        title: 'W3C: Understanding contrast (minimum)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
      },
      { title: 'WebAIM: Contrast checker', url: 'https://webaim.org/resources/contrastchecker/' },
    ],
  },
  hook: {
    look: 'director',
    q: 'Write a hook for a 30-second video about our notes app',
    keys: /\bhook\b.*\bvideo\b|\b30.second (video|reel|ad)\b/i,
    text: 'Open on the problem, not the logo. The first couple of seconds decide whether someone keeps watching, so start in the middle of the action: a desk buried in sticky notes, a phone buzzing with reminders, whatever your product fixes.\n\nHere’s a 30-second structure that works for most products. Meta’s own advice for mobile video is to capture attention quickly and to build for sound off,[1] so put the hook on screen as text as well as in the voiceover. And end on one line and the name, not a list of features: people remember one thing from a short video, so choose which.',
    sources: [
      {
        title: 'Meta for Business: Mobile video ads',
        url: 'https://www.facebook.com/business/news/want-to-better-video-ads-for-mobile-well-show-you-how',
      },
    ],
  },
  workout: {
    look: 'coach',
    q: 'Give me a 20-minute workout with no equipment',
    keys: /\b(no.equipment|bodyweight|home) workout\b|\b20.minute workout\b|\bworkout with no equipment\b/i,
    text: 'Here’s a 20-minute circuit you can do in a living room. Five moves, 40 seconds of effort and 20 seconds of rest each, three rounds, with a short warm-up and cool-down either side. It works the whole body, and the squats, push-ups, lunges and plank count as muscle-strengthening work too.\n\nGo at a pace where you could still say a few words. Make it easier with the options under Moves, and harder by slowing down the lowering half of each rep. Stop if anything hurts sharply, and if you’ve been inactive for a while or have a health condition, check with a doctor first.\n\nFor scale, the NHS suggests adults get at least 150 minutes of moderate or 75 minutes of vigorous activity a week, plus strengthening activities on at least two days.[1] A couple of these circuits a week counts towards both.',
    sources: [
      {
        title: 'NHS: Physical activity guidelines for adults',
        url: 'https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-for-adults-aged-19-to-64/',
      },
    ],
  },
  packing: {
    look: 'traveller',
    q: 'What should I pack for 3 days in Lisbon in October?',
    keys: /\bpack\w*\b.*\blisbon\b|\blisbon\b.*\bpack\w*\b/i,
    text: 'For three days, a carry-on is plenty. Lisbon is built on steep hills and paved with polished stone, the calçada, which gets slippery, so the one thing worth planning around is shoes: comfortable ones with real grip.\n\nEvenings by the river can turn breezy after a warm day, so bring a light layer. Portugal uses type C and F plugs at 230 volts,[1] so UK and US plugs need an adapter. Lisbon’s tap water is treated to European standards,[2] so a refillable bottle saves buying plastic ones. Check the forecast the day before you fly, since spring and autumn can swing between sun and showers.',
    sources: [
      {
        title: 'Electrical Safety First: Portugal plugs',
        url: 'https://www.electricalsafetyfirst.org.uk/guidance/advice-for-you/when-travelling/travel-adaptor-for-portugal/',
      },
      {
        title: 'EPAL: Drinking tap water',
        url: 'https://www.epal.pt/EPAL/en/menu/our-water/campaigns/consumption-of-tap-water',
      },
    ],
  },
  budget: {
    look: 'money',
    q: 'Split my 2,400 monthly take-home pay with the 50/30/20 rule',
    keys: /\b50\s*\/\s*30\s*\/\s*20\b/i,
    text: `With ${money(INCOME)} a month after tax, the 50/30/20 rule gives you ${money(INCOME * 0.5)} for needs, ${money(INCOME * 0.3)} for wants and ${money(INCOME * 0.2)} for savings and paying off debt.[1] Treat the split as a starting point, not a law. Its real value is that it makes you decide what counts as a need.\n\nNeeds are the bills you’d still have to pay if your income stopped tomorrow: rent, utilities, groceries, minimum debt payments, getting to work. Wants are everything that makes life nicer but could pause. If your needs already go past ${money(INCOME * 0.5)}, which is common in expensive cities, take the difference out of wants first and keep something going into savings, even if it’s less than ${money(INCOME * 0.2)}. Start the savings with an emergency fund. The US Consumer Financial Protection Bureau suggests basing the goal on the unexpected costs you’ve had before, and says small automatic transfers are one of the easiest ways to build it.[2]`,
    sources: [
      {
        title: 'Investopedia: The 50/30/20 rule',
        url: 'https://www.investopedia.com/ask/answers/022916/what-502030-budget-rule.asp',
      },
      {
        title: 'CFPB: Building an emergency fund',
        url: 'https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/',
      },
    ],
  },
  booktable: {
    look: 'planner',
    q: 'Find a table for four in Alfama, Lisbon, this Friday at 7:30',
    keys: /\bbook (a )?table\b|\btable for (two|three|four|five|six|\d+)\b/i,
    text: 'I can’t call restaurants from this demo, so here’s a request for Alfama ready to send, and what I’d do if I could book it for you.\n\nFriday evenings fill up first, so ask for one time but say you’re flexible either side: it turns a no into a counter-offer. Mention allergies or a high chair when you book rather than when you arrive, so the kitchen can plan. Alfama’s small family places often only take walk-ins, so check that first before everyone climbs the hill hungry.',
  },
  shippr: {
    look: 'captain',
    q: 'Commit my sign-up changes and open a pull request',
    keys: /\b(open|make|create) (a )?(pull request|pr)\b|\bcommit (my|the|these) changes\b/i,
    text: 'Here’s how I’d ship it. First a look at what actually changed, so nothing unexpected rides along, then the tests, then a commit message that says why the change exists, not only what it touches.\n\nThe pull request is where a reviewer decides whether to trust the change, so I’d write what changed, why, and how it was tested, and open it as a draft if anything is still in progress.[1] Then I stop: merging and deploying wait for your OK.',
    sources: [
      { title: 'GitHub CLI: gh pr create', url: 'https://cli.github.com/manual/gh_pr_create' },
    ],
  },
  signuptests: {
    look: 'tester',
    q: 'Write tests for my sign-up form',
    keys: /\btests? for\b.*\b(sign.?up|form)\b/i,
    text: 'I’d test what can actually go wrong for a real person signing up, not only the happy path. That means the good case, the common mistakes, and the one that quietly causes trouble: someone double-clicking the button and creating two accounts.\n\nBelow is the plan, and the first test written out with Playwright.[1] It finds fields by their labels, the way a person would,[2] so the test keeps working when the markup changes. Once they’re all written I’d run them, fix whatever fails, and only then call it done.',
    sources: [
      { title: 'Playwright: Writing tests', url: 'https://playwright.dev/docs/writing-tests' },
      { title: 'Playwright: Best practices', url: 'https://playwright.dev/docs/best-practices' },
    ],
  },
  deletelogs: {
    look: 'guard',
    q: 'Delete the logs in ./logs older than 30 days',
    keys: /\b(delete|wipe|erase)\b.*\b(logs?|folders?|files?)\b/i,
    text: 'Deleting can’t be undone, so this one **needs your OK first**. Before anything is removed, I’d run the same search without the delete part, so you can see exactly which files match and how much space they take.[1]\n\nIf the list looks right, I’d delete only the files older than 30 days and keep the recent ones, since those are the logs you’d want if something broke this week. For next time, a log rotation tool can do this on a schedule,[2] so the folder never grows this big again.',
    sources: [
      { title: 'GNU find manual', url: 'https://www.gnu.org/software/findutils/manual/find.html' },
      { title: 'logrotate manual', url: 'https://man7.org/linux/man-pages/man8/logrotate.8.html' },
    ],
  },
  dryrun: {
    look: 'guard',
    q: 'Start the dry run',
    keys: /^\s*start the dry run\s*$/i,
    text: 'A dry run only lists the files, so nothing gets deleted. It prints every file in ./logs older than 30 days, then the total size. The commands are in the Terminal tab.\n\nI’m a demo, so I can’t see your files. When you run it, read the list, take out anything you want to keep, and only then say yes to the delete.',
  },
  notnow: {
    look: 'guard',
    q: 'Not now',
    keys: /^\s*not now\s*$/i,
    text: 'No problem. Nothing was deleted, and nothing will run until you ask again.',
  },
  moreresources: {
    look: 'tutor',
    q: 'Send me more resources',
    keys: /^\s*send me more resources\s*$/i,
    text: 'The best next step for a five-year-old is a game. Hide a toy in a box, ask them to guess what’s inside, then peek together. Guessing first and checking after is the whole idea of the story.\n\nFor grown-ups, start with the TED-Ed video in Go further, then the Stanford entry. Both explain why tiny things act so strangely.',
  },
  time: {
    look: 'rest',
    q: 'What time is it right now?',
    keys: /\bwhat time\b|\btime is it\b|\bcurrent time\b|\bwhats the time\b|\bwhat’s the time\b|\bwhat's the time\b/i,
    live: () =>
      `It’s ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} on your device.`,
  },
  date: {
    look: 'rest',
    q: 'What is today’s date, or what day is it?',
    keys: /\b(what|which) (day|date)\b|\btoday’?s date\b|\bwhat(’|')?s the date\b/i,
    live: () =>
      `Today is ${new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`,
  },
  math: {
    look: 'tutor',
    q: 'Work out a simple sum, like 12 × 7',
    keys: null,
    live: q => mathOf(q),
  },
  whoami: {
    look: 'rest',
    q: 'Who are you? What is Momo?',
    keys: /\bwho are you\b|\bwhat are you\b|\bwhat is momo\b|\bwhat(’|')?s your name\b/i,
    text: 'I’m Momo, a small helper who changes outfit for whatever you’re working on. My answers are written ahead of time, so I know a set of everyday topics well rather than everything.',
  },
  abilities: {
    look: 'rest',
    q: 'What can you do? What can I ask you?',
    keys: /\bwhat can you (do|help)\b|\bwhat can i ask\b|\bwhat do you know\b/i,
    text: 'I have written answers for a set of everyday questions: how things like DNS, VPNs and APIs work, quick recipes, common tech problems, short emails and posts, playlists and plant care. I can also tell you the time and date. Ask one and watch me change outfit.',
  },
  howareyou: {
    look: 'rest',
    q: 'How are you?',
    keys: /\bhow are (you|u)\b|\bhow(’|')?s it going\b/i,
    text: 'Bouncy, thanks for asking. What are we working on?',
  },
  joke: {
    look: 'rest',
    q: 'Tell me a joke',
    keys: /\bjoke\b|\bmake me laugh\b/i,
    text: 'Why did the developer go broke? They used up all their cache.',
  },
  thanks: {
    look: 'rest',
    q: 'Thank you',
    keys: /^\s*(thanks|thank you|thx|cheers|ty)\b/i,
    text: 'Any time. Ask me something else whenever you like.',
  },
}

export function mathOf(q) {
  const expr = String(q)
    .trim()
    .replace(/^(what(’|')?s|what is|calculate|compute|work out|solve)\s+/i, '')
    .replace(/[?=\s]+$/, '')
    .replace(/(\d)\s*[x×]\s*(?=[\d(])/gi, '$1*')
    .replace(/÷/g, '/')
    .replace(/\^/g, '**')
  if (!/^[\d\s.+\-*/()]+$/.test(expr) || !/\d\s*(\*\*|[+\-*/])\s*[\d(.-]/.test(expr)) return null
  let value
  try {
    value = Function(`"use strict"; return (${expr})`)()
  } catch {
    return null
  }
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  if (!Number.isFinite(value))
    return /\/\s*0(?![\d.]*[1-9])/.test(expr)
      ? 'That one has no answer: you can’t divide by zero.'
      : 'That number is too big for me to show.'
  const shown = expr
    .replace(/\*\*/g, '^')
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/\s*([+\-^])\s*/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${shown} = ${+value.toPrecision(12)}`
}

export function localAnswer(text) {
  if (mathOf(text)) return 'math'
  for (const [id, a] of Object.entries(ANSWERS)) if (a.keys && a.keys.test(text)) return id
  return null
}

export function answerText(id, q) {
  const a = ANSWERS[id]
  if (!a) return null
  return a.live ? a.live(q) : a.text
}

export const ANSWER_CRITERIA = {
  ...Object.fromEntries(Object.entries(ANSWERS).map(([id, a]) => [id, a.q])),
  none: 'None of these. The message asks about something else, or is only loosely related to one of these questions.',
}
