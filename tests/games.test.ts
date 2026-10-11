import { describe, expect, it } from "vitest";
import { officialHostLabel, parseGameInput, toPublicGame, type Game } from "@/lib/games";

describe("parseGameInput", () => {
  const valid = {
    title: "CodeQuest — Small Studio",
    stack: "HTML · CSS · JavaScript",
    description: "Game belajar web.",
    image: "/work/codequest.jpg",
    play_url: "https://main.codequest.gamer.free/",
    official_url: "https://khincc.itch.io/codequest-small-studio",
    official_label: "",
    is_published: true,
  };

  it("menerima data lengkap dan merapikan spasi", () => {
    const result = parseGameInput({ ...valid, title: "  CodeQuest  " });
    expect(result).toEqual({ ok: true, value: { ...valid, title: "CodeQuest" } });
  });

  it("menolak nama, gambar, link main, atau link official yang kosong", () => {
    expect(parseGameInput({ ...valid, title: " " })).toMatchObject({ ok: false });
    expect(parseGameInput({ ...valid, image: "" })).toMatchObject({ ok: false });
    expect(parseGameInput({ ...valid, play_url: "" })).toMatchObject({ ok: false });
    expect(parseGameInput({ ...valid, official_url: "" })).toMatchObject({ ok: false });
  });

  it("menolak alamat yang bukan http(s), supaya tidak ada javascript: di tautan", () => {
    expect(parseGameInput({ ...valid, play_url: "javascript:alert(1)" })).toMatchObject({ ok: false });
    expect(parseGameInput({ ...valid, official_url: "khincc.itch.io" })).toMatchObject({ ok: false });
    expect(parseGameInput({ ...valid, image: "javascript:alert(1)" })).toMatchObject({ ok: false });
  });

  it("menganggap is_published tanpa nilai boolean sebagai tampil", () => {
    const { is_published, ...withoutFlag } = valid;
    const result = parseGameInput(withoutFlag);
    expect(result.ok && result.value.is_published).toBe(true);
  });
});

describe("toPublicGame", () => {
  const row: Game = {
    id: 1,
    slug: "codequest",
    title: "CodeQuest",
    stack: null,
    description: null,
    image: "/work/codequest.jpg",
    play_url: "https://main.codequest.gamer.free/",
    official_url: "https://www.khincc.itch.io/codequest",
    official_label: null,
    is_published: true,
    position: 0,
    created_at: "",
    updated_at: "",
  };

  it("memakai slug sebagai id dan mengisi kolom kosong dengan teks kosong", () => {
    const game = toPublicGame(row);
    expect(game).toMatchObject({ id: "codequest", stack: "", desc: "", alt: "Cover game CodeQuest" });
  });

  it("memakai nama domain sebagai label official kalau label tidak diisi", () => {
    expect(toPublicGame(row).officialLabel).toBe("khincc.itch.io");
    expect(toPublicGame({ ...row, official_label: "itch.io" }).officialLabel).toBe("itch.io");
  });
});

describe("officialHostLabel", () => {
  it("membuang awalan www dari nama domain", () => {
    expect(officialHostLabel("https://www.example.com/game")).toBe("example.com");
  });
});
