import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ProfileSetupBanner } from "@/components/dashboard/ProfileSetupBanner";

describe("ProfileSetupBanner Component", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("does not render when setup is complete (isComplete: true)", () => {
    const { container } = render(
      <ProfileSetupBanner
        completeness={{
          score: 100,
          isComplete: true,
          nextStepText: "Profile complete",
          completedPillars: 4,
          totalPillars: 4,
        }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render when score is 100 even if isComplete flag is unset", () => {
    const { container } = render(
      <ProfileSetupBanner
        completeness={{
          score: 100,
          isComplete: false,
          nextStepText: "All done",
        }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render when loading", () => {
    const { container } = render(
      <ProfileSetupBanner
        isLoading={true}
        completeness={{
          score: 25,
          isComplete: false,
          nextStepText: "Upload resume",
        }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders progress, next step guidance, and action CTA when profile is incomplete", () => {
    render(
      <ProfileSetupBanner
        completeness={{
          score: 50,
          isComplete: false,
          nextStepText: "Add your core technical skills",
          completedPillars: 2,
          totalPillars: 4,
        }}
      />
    );

    // Score indicator
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("(2/4 steps)")).toBeTruthy();

    // Guidance text
    expect(screen.getByText("Add your core technical skills")).toBeTruthy();

    // CTA button link
    const ctaLink = screen.getByRole("link", { name: /Complete Setup/i });
    expect(ctaLink).toBeTruthy();
    expect(ctaLink.getAttribute("href")).toBe("/profile-setup");
  });

  it("dismisses cleanly on close button click and persists to sessionStorage", () => {
    render(
      <ProfileSetupBanner
        completeness={{
          score: 25,
          isComplete: false,
          nextStepText: "Upload your master resume",
          completedPillars: 1,
          totalPillars: 4,
        }}
      />
    );

    const closeButton = screen.getByRole("button", {
      name: /Dismiss setup banner for this session/i,
    });
    expect(closeButton).toBeTruthy();

    fireEvent.click(closeButton);

    // Banner must now disappear
    expect(screen.queryByText("Upload your master resume")).toBeNull();
    expect(sessionStorage.getItem("ct_profile_setup_banner_dismissed_session")).toBe("true");
  });
});
