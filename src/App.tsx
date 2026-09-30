import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { LoadFactorByRoute } from "./components/LoadFactorByRoute";
import { KpiStrip, KpiCaption } from "./components/KpiStrip";
import { RevenueTrend, RevenueLegend } from "./components/RevenueTrend";
import { RouteRail } from "./components/RouteRail";
import { PageError, PanelEmpty, PanelLoading } from "./components/States";
import {
  segmentButton,
  segmentGroup,
  toggleBase,
  panel,
  panelHeader,
  panelTitle,
  panelMeta,
} from "./components/ui";
import { formatPercent } from "./lib/format";
import { NO_FLIGHTS_TEXT } from "./lib/analytics";
import { monthLabel } from "./lib/months";
import { routeLabel } from "./lib/mock/network";
import { WINDOW_OPTIONS } from "./store/filters";
import { useDashboard } from "./store/viewModel";

export default function App() {
  const vm = useDashboard();
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  const kpiRef = useRef<HTMLDivElement>(null);
  const mapEdgesRef = useRef<SVGGElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (vm.isPending || hasAnimated.current) return;
    const edges = mapEdgesRef.current
      ? Array.from(mapEdgesRef.current.querySelectorAll("line"))
      : [];
    if (!kpiRef.current && edges.length === 0) return;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => {
          hasAnimated.current = true;
        },
      });

      timeline.from(
        "[data-kpi]",
        {
          opacity: 0,
          y: 10,
          duration: 0.5,
          stagger: 0.06,
          clearProps: "opacity,transform",
        },
        0,
      );

      edges.forEach((edge, index) => {
        const length = (edge as SVGLineElement).getTotalLength();
        timeline.fromTo(
          edge,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 0.7,
            ease: "power1.inOut",
            clearProps: "strokeDasharray,strokeDashoffset",
          },
          0.1 + index * 0.05,
        );
      });
    });

    return () => media.revert();
  }, [vm.isPending]);

  if (vm.isError) {
    return (
      <PageError
        message={vm.error?.message ?? "The operations dataset did not load."}
        onRetry={vm.refetch}
      />
    );
  }

  // Plain-language scope banner: what the numbers below currently cover.
  const scopeLabel =
    vm.routeFilter === "all" || !vm.selectedRoute
      ? "All routes"
      : `Showing: ${routeLabel(vm.selectedRoute)}`;

  return (
    <div ref={shellRef} className="min-h-svh">
      <AppHeader vm={vm} />

      <div className="grid gap-px bg-line px-px pb-px lg:grid-cols-[var(--spacing-rail)_1fr] lg:grid-rows-[auto_1fr] lg:items-start">
        {/* KPI strip — row 1 of the main column on desktop, first on mobile. */}
        <div className="flex flex-col gap-px bg-line lg:col-start-2 lg:row-start-1">
          <div
            className={`${panel} flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5`}
          >
            <h2 className={panelTitle}>{scopeLabel}</h2>
            <KpiCaption vm={vm} />
          </div>
          <KpiStrip vm={vm} isPending={vm.isPending} stripRef={kpiRef} />
        </div>

        {/* Rail — left column, spanning both rows on desktop; the sector list
            follows the KPIs on mobile, where the map is hidden. */}
        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-0 lg:max-h-svh lg:overflow-y-auto">
          <RouteRail
            vm={vm}
            isPending={vm.isPending}
            hoveredRouteId={hoveredRouteId}
            onHoverRoute={setHoveredRouteId}
            onSelectRoute={vm.setRoute}
            mapEdgesRef={mapEdgesRef}
          />
        </div>

        {/* Charts — row 2 of the main column; stacked on mobile. */}
        <div className="flex flex-col gap-px bg-line lg:col-start-2 lg:row-start-2">
          <section className={panel}>
            <header className={panelHeader}>
              <h2 className={panelTitle}>Revenue by month</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <RevenueLegend vm={vm} />
              </div>
            </header>
            {vm.isPending ? (
              <PanelLoading
                label="Loading revenue history."
                rows={5}
                minHeightClass="min-h-64"
              />
            ) : vm.series.length === 0 ? (
              <PanelEmpty minHeightClass="min-h-64">
                No revenue history for this selection.
              </PanelEmpty>
            ) : (
              <RevenueTrend vm={vm} />
            )}
          </section>

          <section className={panel}>
            <header className={panelHeader}>
              <h2 className={panelTitle}>How full each route is</h2>
              <p className={panelMeta}>
                {vm.isPending
                  ? "Loading"
                  : vm.networkHasFlights
                    ? `${monthLabel(vm.reportingMonth)} · seats filled, all routes · average ${formatPercent(
                        vm.networkLoadFactorPercent,
                        1,
                      )}`
                    : `${monthLabel(vm.reportingMonth)} · ${NO_FLIGHTS_TEXT}`}
              </p>
            </header>
            {vm.isPending ? (
              <PanelLoading
                label="Loading route load factors."
                rows={6}
                minHeightClass="min-h-64"
              />
            ) : vm.activeRouteRows.length === 0 ? (
              <PanelEmpty minHeightClass="min-h-64">
                No routes to show. Pick a route on the map to continue.
              </PanelEmpty>
            ) : (
              <LoadFactorByRoute vm={vm} onSelectRoute={vm.setRoute} />
            )}
          </section>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}

function AppHeader({ vm }: { vm: ReturnType<typeof useDashboard> }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line bg-surface px-4 py-3">
      <div>
        <h1 className="text-title font-semibold tracking-tight text-ink">
          Route Ops
        </h1>
        <p className="mt-0.5 text-label text-muted">
          How each city pair is doing — punctuality, full planes, revenue ·{" "}
          <span className="font-data tabular-nums">
            {monthLabel(vm.reportingMonth)}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-micro text-faint">Show last</span>
          <div
            className={segmentGroup}
            role="group"
            aria-label="How many months to show"
          >
            {WINDOW_OPTIONS.map((months) => (
              <button
                key={months}
                type="button"
                aria-pressed={vm.windowMonths === months}
                onClick={() => vm.setWindow(months)}
                className={segmentButton}
              >
                {months}m
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-pressed={vm.compareEnabled}
          onClick={vm.toggleCompare}
          className={toggleBase}
        >
          <span aria-hidden="true" className="font-data">
            ±
          </span>
          Compare with previous months
        </button>
      </div>
    </header>
  );
}

function AppFooter() {
  return (
    <footer className="border-t border-line bg-surface px-4 py-3">
      <p className="text-micro text-faint text-center">
        An airline dashboard with made-up numbers. Not affiliated with Ibom Air
        — no real flight data appears on this page.
      </p>
    </footer>
  );
}
