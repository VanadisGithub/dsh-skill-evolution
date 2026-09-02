window.__ModuleLoader__.load({
	id: "skill-evolution",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const h = React.createElement;
		const { useCallback, useEffect, useMemo, useRef, useState } = React;

		const CHANNEL = "/skill-evolution";

		const CSS = `
.dse-section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}
.dse-head{align-items:flex-start;gap:10px;justify-content:space-between;display:flex}
.dse-head h3{margin:0;font-size:15px;font-weight:600;line-height:22px}
.dse-headTexts{flex-direction:column;gap:2px;display:flex;min-width:0}
.dse-sub{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:18px}
.dse-actions{align-items:center;gap:8px;display:flex;flex:none}
.dse-btn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;cursor:pointer;background:0 0;border-radius:6px;align-items:center;gap:5px;padding:4px 10px;display:inline-flex}
.dse-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dse-btn[data-danger=true]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent)}
.dse-btn[data-danger=true]:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)}
.dse-btn[data-primary=true]{color:var(--dsw-alias-state-business-primary)}
.dse-btn:disabled{opacity:.55;cursor:default}
.dse-note{background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);border-radius:8px;padding:8px 10px;font-size:12px;line-height:18px}
.dse-chips{flex-wrap:wrap;gap:6px;display:flex}
.dse-chip{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:5px;padding:1px 7px;font-size:11px;line-height:18px;display:inline-flex}
.dse-chip[data-kind=on]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);color:var(--dsw-alias-state-success-primary);border-color:transparent}
.dse-chip[data-kind=off]{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);color:var(--dsw-alias-state-error-primary);border-color:transparent}
.dse-chip[data-kind=tool]{font-family:var(--ds-font-family-code)}
.dse-chip[data-kind=hot]{background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b45309) 12%, transparent);color:var(--dsw-alias-state-warning-primary,#b45309);border-color:transparent}
.dse-catalog{flex-direction:column;gap:10px;display:flex}
.dse-catalogHeading{align-items:baseline;gap:7px;display:flex}
.dse-catalogHeading h4{margin:0;font-size:13px;font-weight:600}
.dse-catalogHeading span{color:var(--dsw-alias-label-tertiary);font-size:12px;font-variant-numeric:tabular-nums}
.dse-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;overflow:hidden}
.dse-card[data-open=true]{border-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-shadow-lv1)}
.dse-cardHead{width:100%;min-height:52px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;display:flex}
.dse-cardHead:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dse-cardTitle{min-width:0;flex-direction:column;gap:2px;display:flex}
.dse-name{text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;overflow:hidden}
.dse-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dse-cardTrailing{color:var(--dsw-alias-label-tertiary);align-items:center;gap:8px;display:inline-flex;flex:none;font-size:11.5px;font-variant-numeric:tabular-nums}
.dse-dot{background:var(--dsw-alias-label-tertiary);border-radius:999px;width:7px;height:7px;flex:none;display:inline-block}
.dse-dot[data-on=true]{background:var(--dsw-alias-state-success-primary)}
.dse-dot[data-on=false]{background:var(--dsw-alias-label-tertiary);opacity:.5}
.dse-chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .15s var(--ds-ease-in-out)}
.dse-card[data-open=true] .dse-chevron{transform:rotate(180deg)}
.dse-cardBody{border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);flex-direction:column;gap:10px;padding:12px 14px;display:flex}
.dse-metaRow{align-items:baseline;gap:6px;flex-wrap:wrap;display:flex;color:var(--dsw-alias-label-tertiary);font-size:11.5px}
.dse-content{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;border-radius:8px;margin:0;max-height:380px;overflow:auto;padding:10px 12px;font-family:var(--ds-font-family-code);font-size:12px;line-height:18px}
.dse-cardActions{justify-content:flex-end;gap:8px;display:flex}
.dse-empty{border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);border-radius:10px;flex-direction:column;gap:6px;padding:22px 18px;display:flex;font-size:12.5px;line-height:19px;text-align:center;align-items:center}
.dse-empty b{color:var(--dsw-alias-label-secondary)}
.dse-status{color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:20px}
.dse-failure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;display:flex;font-size:12.5px}
.dse-modelConfig{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;flex-direction:column;gap:10px;padding:10px 14px;display:flex}
.dse-modelTitle{color:var(--dsw-alias-label-secondary);font-size:12.5px;font-weight:500}
.dse-modelRow{align-items:flex-end;gap:10px;flex-wrap:wrap;display:flex}
.dse-modelField{flex-direction:column;gap:4px;min-width:180px;flex:1;display:flex}
.dse-modelField>span{color:var(--dsw-alias-label-tertiary);font-size:11px}
.dse-input,.dse-select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);height:30px;font:inherit;font-size:13px;border-radius:6px;padding:0 8px;width:100%}
.dse-input:focus,.dse-select:focus{border-color:var(--dsw-alias-brand-primary);outline:none}
.dse-modelActions{align-items:center;gap:8px;flex-wrap:wrap;display:flex}
.dse-btn[data-primary=true]{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}
.dse-btn[data-primary=true]:disabled{opacity:.45;cursor:default}
.dse-btn:disabled{opacity:.45;cursor:default}
.dse-modelSaved{color:var(--dsw-alias-state-success-primary);margin:0;font-size:12px}
.dse-modelHint{color:var(--dsw-alias-label-tertiary);font-size:11px}
.dse-patterns{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;flex-direction:column;gap:8px;padding:10px 14px;display:flex}
.dse-patterns summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12.5px;user-select:none}
.dse-patternRow{align-items:center;gap:8px;flex-wrap:wrap;display:flex;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.dse-patternRow .dse-chip[data-kind=tool]{font-size:10.5px}
.dse-panel{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;flex-direction:column;gap:10px;padding:10px 14px;display:flex}
.dse-panel>summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12.5px;font-weight:500;user-select:none}
.dse-panelNote{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px;line-height:16px}
.dse-grid{grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px 10px;display:grid}
.dse-field{flex-direction:column;gap:3px;display:flex}
.dse-field>span{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:15px}
.dse-field input[type=number]{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);height:30px;font:inherit;font-size:13px;border-radius:6px;padding:0 8px;width:100%}
.dse-field input[type=number]:focus{border-color:var(--dsw-alias-brand-primary);outline:none}
.dse-toggles{flex-wrap:wrap;gap:6px 14px;display:flex}
.dse-toggle{align-items:center;gap:5px;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12px;display:inline-flex}
.dse-promptBlock{flex-direction:column;gap:4px;display:flex}
.dse-promptBlock>span{color:var(--dsw-alias-label-tertiary);font-size:11px}
.dse-textarea{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);white-space:pre;overflow:auto;border-radius:8px;font-family:var(--ds-font-family-code);font-size:11.5px;line-height:17px;min-height:150px;padding:8px 10px;resize:vertical;width:100%}
.dse-textarea:focus{border-color:var(--dsw-alias-brand-primary);outline:none}
.dse-panelActions{justify-content:flex-end;gap:8px;display:flex}
.dse-tabs{border-bottom:1px solid var(--dsw-alias-border-l2);gap:2px;display:flex}
.dse-tab{border:0;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer;font:inherit;font-size:13px;margin-bottom:-1px;padding:7px 14px;border-bottom:2px solid transparent}
.dse-tab:hover{color:var(--dsw-alias-label-secondary)}
.dse-tab[data-active=true]{color:var(--dsw-alias-label-primary);font-weight:600;border-bottom-color:var(--dsw-alias-brand-primary)}
.dse-switch{align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12.5px;display:inline-flex;user-select:none}
.dse-switch input{accent-color:var(--dsw-alias-brand-primary);cursor:pointer;margin:0;width:15px;height:15px}
.dse-switch[data-off=true]{color:var(--dsw-alias-state-warning-primary,#b45309)}
.dse-chip[data-kind=high]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);color:var(--dsw-alias-state-success-primary);border-color:transparent}
.dse-chip[data-kind=medium]{background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b45309) 12%, transparent);color:var(--dsw-alias-state-warning-primary,#b45309);border-color:transparent}
.dse-chip[data-kind=low]{color:var(--dsw-alias-label-tertiary)}
.dse-help{color:var(--dsw-alias-label-tertiary);font-size:10.5px;line-height:14px}
@media (width<=680px){.dse-head{flex-direction:column}}
`;

		function rpcId() {
			try {
				return crypto.randomUUID();
			} catch {
				return "rpc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
			}
		}

		async function rpc(endpoint, args) {
			const response = await fetch(CHANNEL + "/" + endpoint, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId: rpcId(),
					method: endpoint,
					payload: { args: args || {} }
				})
			});
			if (!response.ok) throw new Error("HTTP " + response.status);
			const envelope = await response.json();
			const result = envelope && envelope.result;
			if (!result || result.ok !== true) {
				const error = result && result.error;
				throw new Error(error ? error.message : "request failed");
			}
			return result.value;
		}

		function fmtTime(iso) {
			if (typeof iso !== "string" || iso.length === 0) return "-";
			try {
				const d = new Date(iso);
				const pad = (n) => String(n).padStart(2, "0");
				return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
			} catch {
				return iso;
			}
		}

		function pct(rate) {
			return Math.round((typeof rate === "number" ? rate : 0) * 100) + "%";
		}

		// Heuristic value rating: repeated evidence or folded-in improvements
		// promote a skill above a single-occurrence crystallization.
		function valueOf(summary) {
			if ((summary.occurrences || 1) >= 3 || (summary.improvements || 0) >= 1) return "high";
			if ((summary.occurrences || 1) >= 2 || (summary.version || 1) > 1) return "medium";
			return "low";
		}

		const VALUE_LABELS = { high: "价值：高", medium: "价值：中", low: "价值：低" };

		function Chevron() {
			return h("svg", { className: "dse-chevron", width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
				h("path", { d: "M3 6l5 5 5-5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }));
		}

		function ToolChips({ sequence, max }) {
			const tools = Array.isArray(sequence) ? sequence : [];
			const limit = max || 6;
			const shown = tools.slice(0, limit);
			const rest = tools.length - shown.length;
			return h("span", { className: "dse-chips" },
				shown.map((tool, i) => h("span", { key: i + ":" + tool, className: "dse-chip", "data-kind": "tool" }, tool)),
				rest > 0 ? h("span", { key: "rest", className: "dse-chip" }, "+" + rest) : null);
		}

		function SkillCard({ summary, onRemoved }) {
			const [open, setOpen] = useState(false);
			const [detail, setDetail] = useState(undefined);
			const [detailError, setDetailError] = useState(undefined);
			const [confirming, setConfirming] = useState(false);
			const [busy, setBusy] = useState(false);
			const confirmTimer = useRef(undefined);

			useEffect(() => () => clearTimeout(confirmTimer.current), []);

			const toggle = useCallback(() => {
				setOpen((prev) => {
					const next = !prev;
					if (next && detail === undefined && detailError === undefined) {
						rpc("get", { name: summary.name })
							.then((value) => setDetail(value))
							.catch((error) => setDetailError(String(error.message || error)));
					}
					return next;
				});
			}, [detail, detailError, summary.name]);

			const askRemove = useCallback(() => {
				if (!confirming) {
					setConfirming(true);
					clearTimeout(confirmTimer.current);
					confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
					return;
				}
				clearTimeout(confirmTimer.current);
				setBusy(true);
				rpc("remove", { name: summary.name })
					.then(() => onRemoved(summary.name))
					.catch(() => setBusy(false));
			}, [confirming, onRemoved, summary.name]);

			const value = valueOf(summary);
			return h("div", { className: "dse-card", "data-open": open },
				h("button", { type: "button", className: "dse-cardHead", onClick: toggle, "aria-expanded": open },
					h("span", { className: "dse-cardTitle" },
						h("span", { className: "dse-name" }, summary.name),
						summary.description ? h("span", { className: "dse-desc" }, summary.description) : null),
					h("span", { className: "dse-cardTrailing" },
						h("span", { className: "dse-dot", "data-on": summary.registered, title: summary.registered ? "已注册到技能目录" : "未注册（autoRegister 关闭）" }),
						h("span", { className: "dse-chip", "data-kind": value, title: "按出现次数、改进次数与版本估算" }, VALUE_LABELS[value]),
						"v" + summary.version,
						(summary.invocations || 0) + " 次调用",
						"更新于 " + fmtTime(summary.updatedAt),
						h(Chevron))),
				open ? h("div", { className: "dse-cardBody" },
					Array.isArray(summary.signals) && summary.signals.length > 0
						? h("div", { className: "dse-metaRow" },
							h("span", {}, "结晶信号"),
							h("span", { className: "dse-chips" }, summary.signals.map((s, i) => h("span", { key: i, className: "dse-chip", "data-kind": "on" }, s))))
						: null,
					h("div", { className: "dse-metaRow" },
						h("span", {}, "工具序列"),
						h(ToolChips, { sequence: summary.toolSequence })),
					h("div", { className: "dse-metaRow" },
						h("span", {}, "创建于 " + fmtTime(summary.createdAt)),
						h("span", {}, "· 出现 " + summary.occurrences + " 次" + (summary.improvements ? " · 改进 " + summary.improvements + " 次" : "")),
						summary.sourcePatternId ? h("span", {}, "· 来源 " + summary.sourcePatternId) : null),
					detailError !== undefined
						? h("div", { className: "dse-failure" }, "加载内容失败：" + detailError)
						: h("pre", { className: "dse-content" }, detail === undefined ? "加载中…" : detail.content),
					h("div", { className: "dse-cardActions" },
						h("button", {
							type: "button",
							className: "dse-btn",
							"data-danger": true,
							disabled: busy,
							onClick: askRemove
						}, busy ? "删除中…" : confirming ? "再次点击确认删除" : "删除此技能"))) : null);
		}

		function PatternList({ stats, config }) {
			const patterns = stats && Array.isArray(stats.patterns) ? stats.patterns : [];
			if (patterns.length === 0) {
				return h("div", { className: "dse-patterns" },
					h("div", { className: "dse-status" }, "实时观察：本进程还没有记录到任何完整回合的工具序列。"));
			}
			return h("details", { className: "dse-patterns" },
				h("summary", {}, "实时观察：" + (stats.totalTraces || 0) + " 个已统计回合 · " + patterns.length + " 种工具序列模式"),
				patterns.map((p) => h("div", { key: p.id, className: "dse-patternRow" },
					h(ToolChips, { sequence: p.toolSequence, max: 8 }),
					h("span", {}, p.occurrences + "/" + (config ? config.minPatternOccurrences : 3) + " 次 · " + pct(p.successRate)),
					p.crystallized
						? h("span", { className: "dse-chip", "data-kind": "on" }, "已结晶")
						: h("span", { className: "dse-chip", "data-kind": p.occurrences >= (config ? config.minPatternOccurrences : 3) ? "hot" : undefined }, "观察中"))));
		}

		function ModelConfig({ config, onChanged }) {
			const [provider, setProvider] = useState(config.llmProvider || "");
			const [model, setModel] = useState(config.llmModel || "");
			const [manualModel, setManualModel] = useState(false);
			const [lang, setLang] = useState(config.skillLanguage || "en");
			const [catalog, setCatalog] = useState(undefined);
			const [busy, setBusy] = useState(false);
			const [message, setMessage] = useState(undefined);
			const overridden = config.modelSource === "runtime";

			// Keep the selector aligned with the server truth after reloads.
			useEffect(() => { setLang(config.skillLanguage || "en"); }, [config.skillLanguage]);

			useEffect(() => {
				let cancelled = false;
				rpc("listModels")
					.then((data) => { if (!cancelled) setCatalog(data); })
					.catch(() => { if (!cancelled) setCatalog({ providers: [], modelsByProvider: {} }); });
				return () => { cancelled = true; };
			}, []);

			const providers = catalog && Array.isArray(catalog.providers) ? catalog.providers : [];
			const optionsOf = (id) => (catalog && catalog.modelsByProvider ? (catalog.modelsByProvider[id] || []) : []);
			const modelOptions = optionsOf(provider);
			const dirty = provider !== (config.llmProvider || "") || model !== (config.llmModel || "");

			// Switching provider re-anchors the model to that provider's own
			// catalog: the old model id belongs to the old route, so an input
			// left as-is would also filter the datalist down to nothing.
			const onProviderChange = useCallback((next) => {
				setProvider(next);
				const options = optionsOf(next);
				if (options.length > 0) {
					setManualModel(false);
					if (!options.some((m) => m.id === model)) setModel(options[0].id);
				} else {
					setManualModel(true);
				}
			}, [catalog, model]);

			const onModelPick = useCallback((value) => {
				if (value === "__manual__") {
					setManualModel(true);
					setModel("");
					return;
				}
				setModel(value);
			}, []);

			// Language applies immediately and persists server-side; revert the
			// selector if the RPC rejects.
			const onLanguageChange = useCallback((next) => {
				setLang(next);
				setBusy(true);
				setMessage(undefined);
				rpc("setLanguage", { language: next })
					.then(() => { setBusy(false); setMessage({ ok: true, text: "生成语言已设为" + (next === "zh" ? "中文" : "English") + "，下次评审即生效" }); onChanged(); })
					.catch((e) => { setBusy(false); setLang(config.skillLanguage || "en"); setMessage({ ok: false, text: String(e.message || e) }); });
			}, [config.skillLanguage, onChanged]);

			const save = useCallback(() => {
				if (!provider.trim() || !model.trim()) {
					setMessage({ ok: false, text: "Provider 和 Model 不能为空" });
					return;
				}
				setBusy(true);
				setMessage(undefined);
				rpc("setModel", { provider: provider.trim(), model: model.trim() })
					.then(() => { setBusy(false); setMessage({ ok: true, text: "已保存，评审立即生效并持久化" }); onChanged(); })
					.catch((e) => { setBusy(false); setMessage({ ok: false, text: String(e.message || e) }); });
			}, [provider, model, onChanged]);

			const reset = useCallback(() => {
				setBusy(true);
				setMessage(undefined);
				rpc("resetModel")
					.then((v) => { setBusy(false); setProvider(v.llmProvider); setModel(v.llmModel); setMessage({ ok: true, text: "已恢复为挂载配置的默认值" }); onChanged(); })
					.catch((e) => { setBusy(false); setMessage({ ok: false, text: String(e.message || e) }); });
			}, [onChanged]);

			return h("div", { className: "dse-modelConfig" },
				h("div", { className: "dse-modelTitle" }, "评审模型与生成语言（结晶与改进评审使用的 LLM，及其输出语言）"),
				h("div", { className: "dse-modelRow" },
					h("label", { className: "dse-modelField" },
						h("span", {}, "Provider"),
						providers.length > 0
							? h("select", { className: "dse-select", value: provider, onChange: (e) => onProviderChange(e.target.value) },
								providers.some((p) => p.id === provider) ? null : h("option", { value: provider }, provider),
								providers.map((p) => h("option", { key: p.id, value: p.id }, p.name && p.name !== p.id ? p.name + " (" + p.id + ")" : p.id)))
							: h("input", { className: "dse-input", value: provider, onChange: (e) => setProvider(e.target.value), placeholder: "provider id" })),
					h("label", { className: "dse-modelField" },
						h("span", {}, "Model"),
						modelOptions.length > 0 && !manualModel
							? h("select", { className: "dse-select", value: modelOptions.some((m) => m.id === model) || model ? model : "__manual__", onChange: (e) => onModelPick(e.target.value) },
								model && !modelOptions.some((m) => m.id === model) ? h("option", { value: model }, model + "（当前值）") : null,
								modelOptions.map((m) => h("option", { key: m.id, value: m.id }, m.name && m.name !== m.id ? m.name + " (" + m.id + ")" : m.id)),
								h("option", { value: "__manual__" }, "手动输入 model id…"))
							: h("input", { className: "dse-input", value: model, onChange: (e) => setModel(e.target.value), placeholder: "model id" })),
					h("label", { className: "dse-modelField" },
						h("span", {}, "生成语言"),
						h("select", { className: "dse-select", value: lang, disabled: busy, onChange: (e) => onLanguageChange(e.target.value) },
							h("option", { value: "zh" }, "中文"),
							h("option", { value: "en" }, "English"))),
					h("div", { className: "dse-modelActions" },
						h("button", { type: "button", className: "dse-btn", "data-primary": true, disabled: busy || !dirty, onClick: save }, busy ? "保存中…" : "保存"),
						manualModel && modelOptions.length > 0
							? h("button", { type: "button", className: "dse-btn", disabled: busy, onClick: () => { setManualModel(false); setModel(modelOptions[0].id); } }, "回到目录")
							: null,
						overridden ? h("button", { type: "button", className: "dse-btn", disabled: busy, onClick: reset }, "恢复默认") : null)),
				message
					? h("p", { className: message.ok ? "dse-modelSaved" : "dse-failure" }, message.text)
					: overridden
						? h("p", { className: "dse-modelHint" }, "当前值来自本界面设置（持久化于 runtime-config.json，优先于挂载配置）")
						: h("p", { className: "dse-modelHint" }, "当前值来自挂载配置；在此保存后将持久化覆盖，重启后仍生效"));
		}

		// Only user-meaningful knobs are exposed; internal observation limits
		// (maxEvidenceSteps, maxImprovementsPerProcess, maxStepTextLength,
		// maxTracesPerSession) stay mount-config-only.
		const NUM_TUNABLES = [
			["minToolCalls", "complex 阈值：工具调用数", "成功回合的工具调用数达到该值，视为完成了一次复杂任务"],
			["minPatternOccurrences", "repeated 阈值：序列出现次数", "同一工具序列重复出现达到该次数且成功率达标，触发重复学习"],
			["minSuccessRate", "repeated 成功率下限", "触发 repeated 信号要求该序列的历史成功率（0-1）"],
			["minTraceSteps", "轨迹最小步数", "少于该步数的回合直接忽略，用于过滤琐碎操作"],
			["improvementEvery", "改进评审频率", "同一序列每重跑该次数，把新经验合并进已有技能（版本递增）"],
			["maxEvolvedSkills", "技能容量上限", "最多保留多少个进化技能，达到上限后不再结晶新技能"],
		];

		const BOOL_TUNABLES = [
			["signals.complex", "信号：复杂任务", "成功且工具调用数达到阈值的回合送 LLM 评审"],
			["signals.recovered", "信号：错误恢复", "有失败步骤但最终成功的回合送评审（找到了绕行路径）"],
			["signals.repeated", "信号：序列重复", "重复出现且成功率达标的工具序列送评审"],
			["complexRequiresCorroboration", "闸门：complex 需佐证", "仅 complex 单独触发时不送审，需叠加错误恢复或序列重复"],
			["autoRegister", "自动注册", "结晶的技能自动注册进技能目录，供 agent 直接调用"],
		];

		function TuningPanel({ config, onChanged }) {
			const defaults = config.defaults || {};
			const bounds = config.tuningBounds || {};
			const snapshotOf = useCallback(() => ({
				numbers: Object.fromEntries(NUM_TUNABLES.map(([key]) => [key, config[key]])),
				bools: Object.fromEntries(BOOL_TUNABLES.map(([key]) => [key, key.startsWith("signals.") ? !!(config.signals && config.signals[key.slice(8)]) : !!config[key]])),
			}), [config]);
			const [draft, setDraft] = useState(snapshotOf);
			const [busy, setBusy] = useState(false);
			const [message, setMessage] = useState(undefined);
			useEffect(() => { setDraft(snapshotOf()); setMessage(undefined); }, [snapshotOf]);

			const overriddenKeys = Object.keys(config.tuningOverrides || {});
			const overridden = overriddenKeys.length > 0;
			const dirty = NUM_TUNABLES.some(([key]) => String(draft.numbers[key]) !== String(config[key]))
				|| BOOL_TUNABLES.some(([key]) => draft.bools[key] !== (key.startsWith("signals.") ? !!(config.signals && config.signals[key.slice(8)]) : !!config[key]));

			const rangeOf = (key) => {
				const ints = bounds.ints || {};
				const rates = bounds.rates || {};
				if (ints[key]) return ints[key];
				if (rates[key]) return rates[key];
				return undefined;
			};

			const save = useCallback(() => {
				const patch = {};
				for (const [key] of NUM_TUNABLES) {
					const parsed = Number(draft.numbers[key]);
					if (!Number.isFinite(parsed)) { setMessage({ ok: false, text: key + " 必须是数字" }); return; }
					if (parsed !== config[key]) patch[key] = parsed;
				}
				const signals = {};
				let hasSignalPatch = false;
				for (const [key] of BOOL_TUNABLES) {
					const current = key.startsWith("signals.") ? !!(config.signals && config.signals[key.slice(8)]) : !!config[key];
					if (draft.bools[key] !== current) {
						if (key.startsWith("signals.")) { signals[key.slice(8)] = draft.bools[key]; hasSignalPatch = true; }
						else patch[key] = draft.bools[key];
					}
				}
				if (hasSignalPatch) patch.signals = signals;
				if (Object.keys(patch).length === 0) { setMessage({ ok: false, text: "没有改动" }); return; }
				setBusy(true);
				setMessage(undefined);
				rpc("setTuning", { tuning: patch })
					.then(() => { setBusy(false); setMessage({ ok: true, text: "已保存并持久化，立即生效" }); onChanged(); })
					.catch((e) => { setBusy(false); setMessage({ ok: false, text: String(e.message || e) }); });
			}, [draft, config, onChanged]);

			const reset = useCallback(() => {
				setBusy(true);
				setMessage(undefined);
				rpc("resetTuning")
					.then(() => { setBusy(false); setMessage({ ok: true, text: "已恢复挂载配置的默认值" }); onChanged(); })
					.catch((e) => { setBusy(false); setMessage({ ok: false, text: String(e.message || e) }); });
			}, [onChanged]);

			return h("details", { className: "dse-panel" },
				h("summary", {}, "阈值与控制" + (overridden ? "（已定制：" + overriddenKeys.join("、") + "）" : "")),
				h("div", { className: "dse-grid" },
					NUM_TUNABLES.map(([key, label, help]) => {
						const range = rangeOf(key);
						return h("label", { key, className: "dse-field" },
							h("span", {}, label),
							h("input", {
								type: "number",
								value: draft.numbers[key],
								step: key === "minSuccessRate" ? "0.05" : "1",
								min: range ? range[0] : undefined,
								max: range ? range[1] : undefined,
								onChange: (e) => setDraft({ ...draft, numbers: { ...draft.numbers, [key]: e.target.value } }),
							}),
							h("span", { className: "dse-help" }, help));
					})),
				h("div", { className: "dse-toggles" },
					BOOL_TUNABLES.map(([key, label, title]) => h("label", { key, className: "dse-toggle", title },
						h("input", {
							type: "checkbox",
							checked: !!draft.bools[key],
							onChange: (e) => setDraft({ ...draft, bools: { ...draft.bools, [key]: e.target.checked } }),
						}),
						h("span", {}, label)))),
				message ? h("p", { className: message.ok ? "dse-modelSaved" : "dse-failure" }, message.text) : null,
				h("div", { className: "dse-panelActions" },
					h("button", { type: "button", className: "dse-btn", "data-primary": true, disabled: busy || !dirty, onClick: save }, busy ? "保存中…" : "保存改动"),
					h("button", { type: "button", className: "dse-btn", disabled: busy || !dirty, onClick: () => setDraft(snapshotOf()) }, "放弃改动"),
					overridden ? h("button", { type: "button", className: "dse-btn", disabled: busy, onClick: reset }, "恢复默认") : null));
		}

		function PromptsPanel({ config, onChanged }) {
			const prompts = config.prompts || {};
			const [draft, setDraft] = useState({ review: prompts.review || "", improve: prompts.improve || "" });
			const [busy, setBusy] = useState(false);
			const [message, setMessage] = useState(undefined);
			useEffect(() => {
				setDraft({ review: prompts.review || "", improve: prompts.improve || "" });
				setMessage(undefined);
			}, [prompts.review, prompts.improve]);

			const saveRole = useCallback((role) => {
				setBusy(true);
				setMessage(undefined);
				rpc("setPrompt", { role, text: draft[role] })
					.then(() => { setBusy(false); setMessage({ ok: true, text: (role === "review" ? "结晶评审提示词" : "改进评审提示词") + "已保存并持久化，下次评审即生效" }); onChanged(); })
					.catch((e) => { setBusy(false); setMessage({ ok: false, text: String(e.message || e) }); });
			}, [draft, onChanged]);

			const resetRole = useCallback((role) => {
				setBusy(true);
				setMessage(undefined);
				rpc("setPrompt", { role, text: "" })
					.then(() => { setBusy(false); setMessage({ ok: true, text: "已恢复内置默认提示词" }); onChanged(); })
					.catch((e) => { setBusy(false); setMessage({ ok: false, text: String(e.message || e) }); });
			}, [onChanged]);

			const block = (role, label, overriddenFlag) => h("div", { key: role, className: "dse-promptBlock" },
				h("span", {}, label + (overriddenFlag ? "（已自定义）" : "（内置默认）")),
				h("textarea", {
					className: "dse-textarea",
					value: draft[role],
					spellCheck: false,
					onChange: (e) => setDraft({ ...draft, [role]: e.target.value }),
				}),
				h("div", { className: "dse-panelActions" },
					h("button", { type: "button", className: "dse-btn", "data-primary": true, disabled: busy || draft[role] === (prompts[role] || ""), onClick: () => saveRole(role) }, "保存"),
					overriddenFlag ? h("button", { type: "button", className: "dse-btn", disabled: busy, onClick: () => resetRole(role) }, "恢复默认") : null));

			return h("details", { className: "dse-panel" },
				h("summary", {}, "评审提示词" + ((prompts.reviewOverridden || prompts.improveOverridden) ? "（已自定义）" : "")),
				h("p", { className: "dse-panelNote" }, "两段提示词分别驱动结晶评审和改进评审；语言指令由上方「生成语言」自动附加，无需在此重复声明。留空保存即恢复内置默认。"),
				block("review", "结晶评审提示词", !!prompts.reviewOverridden),
				block("improve", "改进评审提示词", !!prompts.improveOverridden),
				message ? h("p", { className: message.ok ? "dse-modelSaved" : "dse-failure" }, message.text) : null);
		}

		function MasterSwitch({ config, onChanged }) {
			const [busy, setBusy] = useState(false);
			const onToggle = useCallback((e) => {
				setBusy(true);
				rpc("setEnabled", { enabled: e.target.checked })
					.then(() => { setBusy(false); onChanged(); })
					.catch(() => { setBusy(false); onChanged(); });
			}, [onChanged]);
			return h("label", {
				className: "dse-switch",
				"data-off": !config.enabled,
				title: config.enabled
					? "观察与结晶运行中；关闭后不再观察回合、不再评审，已生成的技能保持可用"
					: "已停用：不观察回合、不评审、不结晶；已生成的技能保持可用",
			},
				h("input", { type: "checkbox", checked: !!config.enabled, disabled: busy, onChange: onToggle }),
				h("span", {}, config.enabled ? "插件已启用" : "插件已停用"));
		}

		function SkillEvolutionSection() {
			const [view, setView] = useState({ status: "loading" });
			const [tab, setTab] = useState("skills");
			const [confirmClear, setConfirmClear] = useState(false);
			const [busy, setBusy] = useState(false);
			const confirmTimer = useRef(undefined);

			useEffect(() => () => clearTimeout(confirmTimer.current), []);

			const load = useCallback(() => {
				setView({ status: "loading" });
				rpc("list")
					.then((data) => setView({ status: "ready", data }))
					.catch((error) => setView({ status: "error", message: String(error.message || error) }));
			}, []);

			useEffect(() => {
				load();
			}, [load]);

			const data = view.status === "ready" ? view.data : undefined;
			const skills = useMemo(() => (data && Array.isArray(data.skills) ? data.skills : []), [data]);
			const config = data && data.config;
			const stats = data && data.stats;

			const handleRemoved = useCallback(() => load(), [load]);

			const askClear = useCallback(() => {
				if (skills.length === 0) return;
				if (!confirmClear) {
					setConfirmClear(true);
					clearTimeout(confirmTimer.current);
					confirmTimer.current = setTimeout(() => setConfirmClear(false), 3000);
					return;
				}
				clearTimeout(confirmTimer.current);
				setBusy(true);
				rpc("clear")
					.then(() => {
						setConfirmClear(false);
						load();
					})
					.catch(() => setBusy(false));
			}, [confirmClear, load, skills.length]);

			return h("div", { className: "dse-section" },
				h("style", {}, CSS),
				h("div", { className: "dse-head" },
					h("div", { className: "dse-headTexts" },
						h("h3", {}, "技能进化 · Skill Evolution"),
						h("p", { className: "dse-sub" }, "Hermes 式自进化：每个成功回合结束时按信号评审，把值得复用的工作流提炼为技能，并在后续使用中持续改进")),
					h("div", { className: "dse-actions" },
						config ? h(MasterSwitch, { config, onChanged: load }) : null,
						h("button", { type: "button", className: "dse-btn", onClick: load, disabled: view.status === "loading" }, "刷新"))),
				view.status === "loading" ? h("p", { className: "dse-status" }, "加载中…") : null,
				view.status === "error" ? h("div", { className: "dse-failure" },
					h("p", {}, "无法读取进化技能：" + view.message),
					h("button", { type: "button", className: "dse-btn", onClick: load }, "重试")) : null,
				data ? h(React.Fragment, null,
					h("div", { className: "dse-tabs" },
						h("button", { type: "button", className: "dse-tab", "data-active": tab === "skills", onClick: () => setTab("skills") }, "技能（" + skills.length + "）"),
						h("button", { type: "button", className: "dse-tab", "data-active": tab === "settings", onClick: () => setTab("settings") }, "设置")),
					tab === "skills" ? h(React.Fragment, null,
						config.enabled ? null : h("p", { className: "dse-status" }, "插件当前已停用：新的回合不会被观察和结晶；已有技能保持可用。可在右上角总开关重新启用。"),
						h("div", { className: "dse-catalog" },
							h("div", { className: "dse-catalogHeading" },
								h("h4", {}, "已生成的技能"),
								h("span", {}, String(skills.length))),
							skills.length === 0
								? h("div", { className: "dse-empty" },
									h("div", {}, h("b", {}, "还没有进化技能")),
									h("div", {}, "每个成功回合结束时，插件按 Hermes 模型检测信号：复杂任务（≥" + config.minToolCalls + " 次工具调用）、"),
									h("div", {}, "从错误中恢复、或同一序列重复 ≥" + config.minPatternOccurrences + " 次。任一信号触发 LLM 评审，"),
									h("div", {}, "值得复用的工作流会被提炼为技能并注册；后续同类执行还会把新经验合并进已有技能（版本递增）。"),
									h("div", {}, "评审统计在本进程内存中进行，服务重启后重新累计；已生成的技能会持久保存。"))
								: skills.map((summary) => h(SkillCard, { key: summary.name, summary, onRemoved: handleRemoved })),
							skills.length > 0 ? h("div", { className: "dse-cardActions" },
								h("button", {
									type: "button",
									className: "dse-btn",
									"data-danger": true,
									disabled: busy,
									onClick: askClear
								}, busy ? "清空中…" : confirmClear ? "再次点击确认清空全部" : "清空全部（" + skills.length + "）")) : null))
						: h(React.Fragment, null,
							h("div", { className: "dse-chips" },
								h("span", { className: "dse-chip", "data-kind": config.enabled ? "on" : "off" },
									config.enabled ? "插件：运行中" : "插件：已停用"),
								h("span", { className: "dse-chip", "data-kind": config.autoRegister ? "on" : "off" },
									config.autoRegister ? "自动注册：开" : "自动注册：关"),
								config.signals && config.signals.complex ? h("span", { className: "dse-chip" }, "信号：复杂任务 ≥" + config.minToolCalls + " 次调用") : null,
								config.signals && config.signals.recovered ? h("span", { className: "dse-chip" }, "信号：从错误中恢复") : null,
								config.signals && config.signals.repeated ? h("span", { className: "dse-chip" }, "信号：序列重复 ≥" + config.minPatternOccurrences + " 次") : null,
								config.complexRequiresCorroboration ? h("span", { className: "dse-chip" }, "闸门：单独 complex 需佐证才送审") : null,
								h("span", { className: "dse-chip" }, "LLM：" + config.llmProvider + " / " + config.llmModel + (config.modelSource === "runtime" ? "（界面设置）" : "")),
								h("span", { className: "dse-chip" }, "生成语言：" + (config.skillLanguage === "zh" ? "中文" : "English")),
								h("span", { className: "dse-chip" }, "容量：" + skills.length + "/" + config.maxEvolvedSkills)),
							h(ModelConfig, { config, onChanged: load }),
							h(TuningPanel, { config, onChanged: load }),
							h(PromptsPanel, { config, onChanged: load }),
							h(PatternList, { stats, config }))) : null);
		}

		const inject = ["slots"];

		function apply(ctx) {
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "skill-evolution",
				order: 300,
				label: () => "技能进化"
			}, SkillEvolutionSection));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
