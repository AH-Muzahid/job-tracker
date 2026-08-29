import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import HITLConfirmForm from "../HITLConfirmForm"

// Mock DecorIcon because it uses custom styling/variants that we don't need to test here
vi.mock("@/components/decor-icon", () => ({
  DecorIcon: () => React.createElement("div", { "data-testid": "decor-icon" }),
}))

describe("HITLConfirmForm", () => {
  it("renders outreach email fields and updates values", () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const args = {
      recipientEmail: "test@example.com",
      subject: "Hello",
      bodyText: "This is a body",
    }

    render(
      React.createElement(HITLConfirmForm, {
        toolName: "sendOutreachEmailViaResend",
        args: args,
        onConfirm: onConfirm,
        onCancel: onCancel,
        message: "Please confirm sending email",
      })
    )

    // Verify fields are rendered with correct values
    const toInput = screen.getByLabelText(/To \(Recipient Email\)/i) as HTMLInputElement
    const subjectInput = screen.getByLabelText(/Subject/i) as HTMLInputElement
    const bodyTextarea = screen.getByLabelText(/Body Text/i) as HTMLTextAreaElement

    expect(toInput.value).toBe("test@example.com")
    expect(subjectInput.value).toBe("Hello")
    expect(bodyTextarea.value).toBe("This is a body")

    // Update fields
    fireEvent.change(toInput, { target: { value: "new@example.com" } })
    fireEvent.change(subjectInput, { target: { value: "New Subject" } })
    fireEvent.change(bodyTextarea, { target: { value: "New Body Text" } })

    // Confirm
    const confirmButton = screen.getByRole("button", { name: /Confirm Action/i })
    fireEvent.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledWith({
      recipientEmail: "new@example.com",
      to: "new@example.com",
      subject: "New Subject",
      bodyText: "New Body Text",
      body: "New Body Text",
      confirmed: true,
    })
  })

  it("renders delete application fields", () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const args = {
      companyOrTitle: "Stripe",
    }

    render(
      React.createElement(HITLConfirmForm, {
        toolName: "deleteApplication",
        args: args,
        onConfirm: onConfirm,
        onCancel: onCancel,
      })
    )

    const input = screen.getByLabelText(/Company name or Job Title/i) as HTMLInputElement
    expect(input.value).toBe("Stripe")

    fireEvent.change(input, { target: { value: "Google" } })

    const confirmButton = screen.getByRole("button", { name: /Confirm Action/i })
    fireEvent.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledWith({
      companyOrTitle: "Google",
      confirmed: true,
    })
  })

  it("renders JSON editor fallback for other tools and handles changes", () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const args = {
      applications: [
        { companyName: "Netflix", jobTitle: "SWE" }
      ]
    }

    render(
      React.createElement(HITLConfirmForm, {
        toolName: "batchImportApplications",
        args: args,
        onConfirm: onConfirm,
        onCancel: onCancel,
      })
    )

    const textarea = screen.getByLabelText(/applications/i) as HTMLTextAreaElement
    expect(JSON.parse(textarea.value)).toEqual(args.applications)

    // Edit the text to a valid new JSON array
    const validJsonText = JSON.stringify([{ companyName: "Meta", jobTitle: "Lead SWE" }], null, 2)
    fireEvent.change(textarea, { target: { value: validJsonText } })

    const confirmButton = screen.getByRole("button", { name: /Confirm Action/i })
    fireEvent.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledWith({
      applications: [{ companyName: "Meta", jobTitle: "Lead SWE" }],
      confirmed: true,
    })
  })
})
