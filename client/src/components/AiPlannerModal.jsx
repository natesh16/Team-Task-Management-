import React, { useState } from "react";
import api from "../services/api";
import Modal from "./Modal";
import Icon from "./Icon";
import { PriorityBadge } from "./Badge";
import { useToast } from "./Toast";
import { getErrorMessage } from "../utils/format";

export default function AiPlannerModal({ open, onClose, teamId, boardId, onCreated }) {
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [plan, setPlan] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/ai/plan", { prompt, teamId });
      setPlan(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not generate task plan"));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!plan?.proposal || !teamId) return;
    setCreating(true);
    try {
      await api.post("/tasks", {
        ...plan.proposal,
        team: teamId,
        board: boardId || undefined,
        status: "todo",
      });
      toast.success("AI-planned task created");
      setPrompt("");
      setPlan(null);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not create task"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Task Planner"
      subtitle="Describe an objective — review the proposed subtasks and confirm before creating."
    >
      <div className="form-stack">
        <form onSubmit={handleAnalyze} className="form-stack">
          <div className="field">
            <label>What do you need to accomplish?</label>
            <textarea
              className="input"
              rows={3}
              placeholder='e.g., "I need to complete my backend authentication module by Friday"'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !prompt.trim()}
          >
            <Icon name="sparkles" size={16} />{" "}
            {loading ? "Analyzing..." : "Generate Plan"}
          </button>
        </form>

        {plan?.proposal && (
          <div
            className="panel"
            style={{ padding: "1rem", background: "var(--surface-soft)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <strong>{plan.proposal.title}</strong>
              <PriorityBadge priority={plan.proposal.priority} />
            </div>
            <p className="muted" style={{ fontSize: "0.82rem", margin: "0.35rem 0 0.7rem" }}>
              Due: {plan.proposal.dueDate} · Est: {plan.proposal.estimatedMinutes} min
            </p>
            <div className="check-list" style={{ marginBottom: "0.85rem" }}>
              {(plan.proposal.subtasks || []).map((s, idx) => (
                <div className="check-row" key={idx}>
                  <Icon name="check" size={14} />
                  <span style={{ fontSize: "0.82rem" }}>{s.title}</span>
                </div>
              ))}
            </div>
            {(plan.insights || []).length > 0 && (
              <div className="muted" style={{ fontSize: "0.78rem", marginBottom: "0.75rem" }}>
                {plan.insights.map((ins, i) => (
                  <div key={i}>• {ins}</div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPlan(null)}
              >
                Discard
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmCreate}
                disabled={creating}
              >
                {creating ? "Creating..." : "Confirm & Create Task"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
