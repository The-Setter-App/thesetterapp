import LoginTestimonialCards from "./LoginTestimonialCards";
import LoginTileDrips from "./LoginTileDrips";

// Desktop-only companion to the sign-in form: one tinted tile carrying the
// pitch and the testimonials. Phones get the form on its own.
export default function LoginBrandPanel() {
  return (
    <aside className="hidden lg:flex lg:flex-1 lg:p-4">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[2rem] bg-[#F8F7FF]">
        <LoginTileDrips />
        <LoginTestimonialCards />

        <div className="relative max-w-xl px-8 text-center">
          <h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-[#101011] xl:text-[2.75rem]">
            Join teams turning followers into customers
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-pretty text-[1.0625rem] leading-[1.45] text-[#606266]">
            A clearer inbox, a more accountable team, and a complete view from
            first DM to revenue.
          </p>
        </div>
      </div>
    </aside>
  );
}
