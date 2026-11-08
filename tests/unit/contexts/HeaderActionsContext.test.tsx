import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";

import { HeaderActionsProvider, useHeaderActions, useHeaderSlot } from "@/contexts/HeaderActionsContext";

function Header() {
  const slot = useHeaderSlot();
  return (
    <header>
      <span data-testid="crumb">{slot?.breadcrumb}</span>
      <span data-testid="primary">{slot?.primary}</span>
    </header>
  );
}

function Page({ label }: { label: string }) {
  useHeaderActions({ breadcrumb: <b>{label}</b>, primary: <button>Compose</button> }, [label]);
  return null;
}

function App() {
  const [show, setShow] = useState(true);
  const [label, setLabel] = useState("Inbox");
  return (
    <HeaderActionsProvider>
      <Header />
      {show && <Page label={label} />}
      <button onClick={() => setLabel("Sent")}>rename</button>
      <button onClick={() => setShow(false)}>leave</button>
    </HeaderActionsProvider>
  );
}

describe("HeaderActionsContext", () => {
  it("shows the page's slot, updates it and clears it on unmount", () => {
    render(<App />);
    expect(screen.getByTestId("crumb")).toHaveTextContent("Inbox");
    expect(screen.getByRole("button", { name: "Compose" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "rename" }));
    expect(screen.getByTestId("crumb")).toHaveTextContent("Sent");

    fireEvent.click(screen.getByRole("button", { name: "leave" }));
    expect(screen.getByTestId("crumb")).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: "Compose" })).toBeNull();
  });

  it("is a no-op without a provider", () => {
    render(<Page label="x" />);
    expect(document.body).toBeInTheDocument();
  });
});
