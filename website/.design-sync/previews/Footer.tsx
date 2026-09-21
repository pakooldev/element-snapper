import { Footer } from "element-snapper-website";

// Footer takes no props. Its design only reads correctly in relation to the
// content above it — it carries a top border and a 60px top margin — so the
// second cell is the one that actually shows the component doing its job.

export function Default() {
  return <Footer />;
}

export function AfterPageContent() {
  return (
    <>
      <section className="container" style={{ paddingTop: 8 }}>
        <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
          Why Element Snapper?
        </h2>
        <p className="section-subtitle">
          Engineered for developers, designers, and QA engineers who need
          precision.
        </p>
      </section>
      <Footer />
    </>
  );
}
