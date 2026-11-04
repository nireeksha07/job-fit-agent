// Runs in the browser on https://www.linkedin.com/jobs/ (via Claude in Chrome's JavaScript tool).
// Uses LinkedIn's public guest endpoints; read-only, no login actions.

const TITLES = ["Product Manager", "Associate Product Manager", "Technical Product Manager",
  "Product Owner", "Senior Business Analyst", "Business Systems Analyst", "Lead Business Analyst",
  "AI Automation Business Analyst", "Technical Product Owner", "Product Analyst"];
const SEARCHES = [["Bengaluru", "2%2C3"],  // f_WT: 2 = remote, 3 = hybrid
                  ["India", "2"]];        // remote India
const TARGETS = ["atlassian", "salesforce", "adobe", "intuit", "servicenow", "microsoft", "google",
  "amazon", "walmart", "american express", "visa", "mastercard", "paypal", "razorpay", "phonepe" /* … */];

// Whole-word match so "cred" doesn't match "InCred" and "intuit" doesn't match "Intuitive".
const isTarget = c => TARGETS.some(t =>
  new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`).test(c.toLowerCase()));

async function searchJobs(alreadySeen = new Set()) {
  const out = {};
  for (const [loc, wt] of SEARCHES) for (const title of TITLES) for (const start of [0, 25, 50]) {
    const url = `/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(title)}` +
                `&location=${loc}&f_TPR=r86400&f_WT=${wt}&start=${start}`;   // r86400 = last 24h
    const html = await (await fetch(url)).text();
    for (const card of html.split('data-entity-urn="urn:li:jobPosting:').slice(1)) {
      const id = card.match(/^\d+/)[0];
      if (alreadySeen.has(id)) continue;
      const role = (card.match(/base-search-card__title[^>]*>([\s\S]*?)</) || [])[1]?.trim() || "";
      const company = (card.match(/base-search-card__subtitle[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)</) || [])[1]?.trim() || "";
      if (isTarget(company)) out[id] = { role, company, loc };
    }
  }
  return out;
}

const strip = s => s.replace(/<br\s*\/?>|<\/li>|<\/p>/g, " • ").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/(\s*•\s*)+/g, " • ").replace(/\s+/g, " ").trim();

async function getJobDescription(id) {
  const html = await (await fetch(`/jobs-guest/jobs/api/jobPosting/${id}`)).text();
  const i = html.indexOf("show-more-less-html__markup");
  const j = html.indexOf("show-more-less-html__button", i);
  const seg = html.slice(i, j);
  return strip(seg.slice(seg.indexOf(">") + 1));
}
