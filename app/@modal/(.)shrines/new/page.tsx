// Static `new` beats the dynamic `(.)shrines/[slug]` interceptor, so a soft
// navigation from /shrines to /shrines/new doesn't get captured as a "slug=new"
// modal — the full create page renders instead.
export default function NewShrineModalIntercept() {
  return null;
}
