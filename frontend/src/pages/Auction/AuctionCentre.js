// Public Auction Centre (guest view).
// Shows ongoing, upcoming, and ended auctions (with winners).
// Uses asset() helper so images work in dev/prod regardless of port.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import Footer from "../../Components/Footer";
import "./AuctionCentre.css";
import { request } from "../../api";

// === Image path resolver ===
const BACKEND = process.env.REACT_APP_API_URL || "http://localhost:5000";
const asset = (p) => {
  if (!p) return "";
  if (
    p.startsWith("http://") ||
    p.startsWith("https://") ||
    p.startsWith("data:")
  )
    return p;
  return `${BACKEND}${p.startsWith("/") ? "" : "/"}${p}`;
};

const fmtMoney = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function useCountdown(targetISO) {
  const target = useMemo(() => new Date(targetISO).getTime(), [targetISO]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = target - now;
  const total = Math.max(diff, 0);
  const days = Math.floor(total / 86400000);
  const hours = Math.floor((total % 86400000) / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  return { total, days, hours, minutes, seconds };
}

export default function AuctionCentre() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);

  // Load all 3 sections
  useEffect(() => {
    const load = async () => {
      const qs = (s) =>
        `/api/auctions/public?status=${s}&type=${encodeURIComponent(
          category
        )}&q=${encodeURIComponent(search)}`;
      const [og, up, hi] = await Promise.all([
        request(qs("ongoing")),
        request(qs("upcoming")),
        request(qs("ended")),
      ]);
      setOngoing(og.items || []);
      setUpcoming(up.items || []);
      setHistory(hi.items || []);
    };
    load().catch(() => {
      setOngoing([]);
      setUpcoming([]);
      setHistory([]);
    });
  }, [search, category]);

  const showOngoing = status === "all" || status === "ongoing";
  const showUpcoming = status === "all" || status === "upcoming";

  const goLogin = (from) => navigate("/login", { state: { from } });

  return (
    <div className="ac-page">
      <Header />
      <main className="ac-container">
        <h1 className="ac-title">Auction Center</h1>

        <div className="ac-search-filter">
          <div className="ac-search-box">
            <i className="fa-solid fa-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search gems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search auctions"
            />
          </div>

          <select
            className="ac-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="diamond">Diamonds</option>
            <option value="sapphire">Sapphires</option>
            <option value="ruby">Rubies</option>
            <option value="emerald">Emeralds</option>
            <option value="other">Other Gems</option>
          </select>

          <select
            className="ac-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="ongoing">Ongoing</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>

        {showOngoing && (
          <Section title="Ongoing Auctions">
            <div className="ac-list">
              {ongoing.length === 0 ? (
                <p className="ac-empty">
                  No ongoing auctions match your filters.
                </p>
              ) : (
                ongoing.map((a) => (
                  <OngoingCard
                    key={a._id}
                    auction={a}
                    onBid={() => goLogin(`/auction/${a._id}`)}
                  />
                ))
              )}
            </div>
          </Section>
        )}

        {showUpcoming && (
          <Section title="Upcoming Auctions">
            <div className="ac-list">
              {upcoming.length === 0 ? (
                <p className="ac-empty">
                  No upcoming auctions match your filters.
                </p>
              ) : (
                upcoming.map((a) => (
                  <UpcomingCard
                    key={a._id}
                    auction={a}
                    onReminder={() => goLogin(`/auction/${a._id}`)}
                  />
                ))
              )}
            </div>
          </Section>
        )}

        <Section title="Auction History">
          <div className="ac-table-wrap">
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Gem</th>
                  <th>Details</th>
                  <th>Winner</th>
                  <th>Won Price</th>
                  <th>End Date</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="ac-empty">
                      No auction history matches your filters.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h._id}>
                      <td>{h.title}</td>
                      <td>{h.description}</td>
                      <td>
                        <span className="ac-winner">{h.winnerName || "-"}</span>
                      </td>
                      <td>
                        <span className="ac-won">
                          {fmtMoney(h.finalPrice || 0)}
                        </span>
                      </td>
                      <td>{fmtDate(h.endTime)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="ac-section">
      <div className="ac-section-title">
        <h2>{title}</h2>
        <span className="ac-section-underline" />
      </div>
      {children}
    </section>
  );
}

function OngoingCard({ auction, onBid }) {
  const { total, days, hours, minutes, seconds } = useCountdown(
    auction.endTime
  );
  const ended = total <= 0;
  return (
    <div className="ac-card">
      <div
        className={`ac-badge ${ended ? "ac-badge-ended" : "ac-badge-ongoing"}`}
      >
        {ended ? "ENDED" : "ONGOING"}
      </div>
      <img
        className="ac-image"
        src={asset(auction.imageUrl)}
        alt={auction.title}
      />
      <h3 className="ac-card-title">{auction.title}</h3>
      <p className="ac-meta">
        <i className="fa-solid fa-gem" /> {auction.type}
      </p>
      <p className="ac-desc">{auction.description}</p>
      <div className="ac-price">Current: {fmtMoney(auction.currentPrice)}</div>
      <p className="ac-line">
        <strong>Base Price:</strong> {fmtMoney(auction.basePrice)}
      </p>
      <p className="ac-line">
        <strong>Ends:</strong> {fmtDate(auction.endTime)}
      </p>
      <div className="ac-countdown">
        {ended ? (
          <span className="ac-ended">Auction ended</span>
        ) : (
          <>
            <TimeBox v={days} lbl="Days" />
            <TimeBox v={hours} lbl="Hours" />
            <TimeBox v={minutes} lbl="Mins" />
            <TimeBox v={seconds} lbl="Secs" />
          </>
        )}
      </div>
      <button className="ac-btn" onClick={onBid} disabled={ended}>
        Bid Now
      </button>
    </div>
  );
}

function UpcomingCard({ auction, onReminder }) {
  const { total, days, hours, minutes, seconds } = useCountdown(
    auction.startTime
  );
  const started = total <= 0;
  return (
    <div className="ac-card">
      <div
        className={`ac-badge ${
          started ? "ac-badge-ongoing" : "ac-badge-upcoming"
        }`}
      >
        {started ? "STARTED" : "UPCOMING"}
      </div>
      <img
        className="ac-image"
        src={asset(auction.imageUrl)}
        alt={auction.title}
      />
      <h3 className="ac-card-title">{auction.title}</h3>
      <p className="ac-meta">
        <i className="fa-solid fa-gem" /> {auction.type}
      </p>
      <p className="ac-desc">{auction.description}</p>
      <div className="ac-price">Base: {fmtMoney(auction.basePrice)}</div>
      <p className="ac-line">
        <strong>Starts:</strong> {fmtDate(auction.startTime)}
      </p>
      <p className="ac-line">
        <strong>Ends:</strong> {fmtDate(auction.endTime)}
      </p>
      <div className="ac-countdown">
        {started ? (
          <span className="ac-started">Auction started</span>
        ) : (
          <>
            <TimeBox v={days} lbl="Days" />
            <TimeBox v={hours} lbl="Hours" />
            <TimeBox v={minutes} lbl="Mins" />
            <TimeBox v={seconds} lbl="Secs" />
          </>
        )}
      </div>
      <button className="ac-btn ac-btn-outline" onClick={onReminder}>
        Set Reminder
      </button>
    </div>
  );
}

function TimeBox({ v, lbl }) {
  return (
    <div className="ac-timebox">
      <div className="ac-timebox-value">{String(v).padStart(2, "0")}</div>
      <div className="ac-timebox-label">{lbl}</div>
    </div>
  );
}
