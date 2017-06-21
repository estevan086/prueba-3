/*global location */
sap.ui.define([
	"com/promigas/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/promigas/model/formatter"
], function(BaseController, JSONModel, formatter, aConnections, sContainerId) {
	"use strict";

	return BaseController.extend("com.promigas.controller.Detail", {

		//-----------------------------------------------------------------------------------------------------------------------------
		// Global Properties
		//-----------------------------------------------------------------------------------------------------------------------------

		aConnections: null, // Required to access elements in callback since they are coming from oEvent.
		sContainerId: "", // Required in order to access the right container			

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
			
			var oModel = new sap.ui.model.json.JSONModel();
			var viewPf = this.getView();
			oModel.setData(this._oLanesAndNodesWithLabels);
			var pf1 = viewPf.byId("processflow1");
			pf1.setModel(oModel);
			pf1.updateModel();
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress: function() {
			var oViewModel = this.getModel("detailView");

			sap.m.URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function() {
			var oViewModel = this.getModel("detailView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});

			oShareDialog.open();
		},

		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function(oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView");

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel().metadataLoaded().then(function() {
				var sObjectPath = this.getModel().createKey("ticketSet", {
					Idticket: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function(sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.Idticket,
				sObjectName = oObject.DesTicket,
				oViewModel = this.getModel("detailView");

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
			oViewModel.setProperty("/shareOnJamTitle", sObjectName);
			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		},

		_onMetadataLoaded: function() {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView"),
				oLineItemTable = this.byId("lineItemsList"),
				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);

			oLineItemTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		//-----------------------------------------------------------------------------------------------------------------------------
		// Acciones nodos y labels
		//-----------------------------------------------------------------------------------------------------------------------------
		  onZoomIn: function () {
		    this.getView().byId("processflow1").zoomIn();
		    this.getView().byId("processflow1").getZoomLevel();
		    sap.m.MessageToast.show("Zoom level changed to: " + this.getView().byId("processflow1").getZoomLevel());
		  },
		
		  onZoomOut: function () {
		    this.getView().byId("processflow1").zoomOut();
		    this.getView().byId("processflow1").getZoomLevel();
		    sap.m.MessageToast.show("Zoom level changed to: " + this.getView().byId("processflow1").getZoomLevel());
		  },
		  
		onNodePress: function(oEvent) {
			sap.m.MessageToast.show("Nodo con id " + oEvent.getParameters().getNodeId() + " presionado");
		},

		onLabelPress: function(oEvent) {
			aConnections = oEvent.getParameter("connections");
			sContainerId = oEvent.getSource().getId().split("-")[2];

			var oSelectedLabel = oEvent.getParameter("selectedLabel");
			var oListData = this._getListData(aConnections);
			var oItemTemplate = new sap.m.StandardListItem({
				title: "{title}",
				info: "{info}"
			});
			
			if(oSelectedLabel.sId === "myButtonId1To10"){
			alert("ejecutarAccion id " + oSelectedLabel.sId );
			return;
			}
			
			var oList = this._createList(oListData, oItemTemplate);

			var oBeginButton = new sap.m.Button({
				text: "Action1",
				type: sap.m.ButtonType.Reject,
				press: function() {
					oResponsivePopover.setShowCloseButton(false);
				}
			});

			var oEndButton = new sap.m.Button({
				text: "Action2",
				type: sap.m.ButtonType.Accept,
				press: function() {
					oResponsivePopover.setShowCloseButton(true);
				}
			});

			var oResponsivePopover = sap.ui.getCore().byId("__popover");
			oResponsivePopover = oResponsivePopover || new sap.m.ResponsivePopover("__popover", {
				placement: sap.m.PlacementType.Auto,
				title: "Paths[" + aConnections.length + "]",
				content: [oList],
				showCloseButton: false,
				afterClose: function() {
					// Uncomment this code to reset "selected" path on close of popover on none mobile devices.
					//if (!sap.ui.Device.system.mobile) {
					//this.getView().byId("processflow1").setSelectedPath(null, null);
					//}
					oResponsivePopover.destroy();
					this.getView().byId(sContainerId).setFocusToLabel(oSelectedLabel);
				}.bind(this),
				beginButton: oBeginButton,
				endButton: oEndButton,
			});
			if (sap.ui.Device.system.phone) {
				oResponsivePopover.setShowCloseButton(true);
			}
			oResponsivePopover.openBy(oSelectedLabel);
		},

		_getListData: function() {
			var aNavigation = [];
			for (var i = 0; i < aConnections.length; i++) {
				aNavigation.push(this._createListEntryObject(aConnections[i]));
			}

			return {
				navigation: aNavigation
			};
		},

		_createListEntryObject: function(oConnection) {
			var sId = oConnection.sourceNode.getNodeId() + "-" + oConnection.targetNode.getNodeId();
			var sTitle = oConnection.label.getText();

			return {
				title: sTitle,
				info: sId,
				type: "Active",
			};
		},

		//-----------------------------------------------------------------------------------------------------------------------------
		// Helpers
		//-----------------------------------------------------------------------------------------------------------------------------

		_createList: function(data, itemTemplate) {
			var oModel = new sap.ui.model.json.JSONModel();

			// Sets the data for the model
			oModel.setData(data);

			// Sets the model to the list
			var oTmpList = new sap.m.List({
				mode: sap.m.ListMode.SingleSelectMaster,
				selectionChange: this.onListItemPress.bind(this)
			});
			oTmpList.setModel(oModel);

			// Binds Aggregation
			oTmpList.bindAggregation("items", "/navigation", itemTemplate);

			return oTmpList;
		},

		onListItemPress: function(oEvent) {
			var selectedItem = oEvent.getParameter("listItem");
			var aSourceTarget = selectedItem.getInfo().split("-");
			var sSourceId = aSourceTarget[0];
			var sTargetId = aSourceTarget[1];
			this._getItemBySourceAndTargetId(sSourceId, sTargetId);
		},

		//-----------------------------------------------------------------------------------------------------------------------------
		// Models
		//-----------------------------------------------------------------------------------------------------------------------------

		_oLanesAndNodesWithLabels: {
			nodes: [{
				id: "1",
				lane: "0",
				title: "Sales Order 1",
				titleAbbreviation: "SO 1",
				children: [{
					nodeId: 10,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId1To10",
						text: "3m",
						enabled: true,
						icon: "sap-icon://message-success",
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Planned,
					})
				}, {
					nodeId: 11,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId1To11",
						text: "2h 15m",
						enabled: false,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.PlannedNegative,
					})
				}, {
					nodeId: 12,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId1To12",
						text: "2d",
						enabled: true,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.PlannedNegative,
					})
				}, {
					nodeId: 13,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId1To13",
						text: "2w 3d",
						icon: "sap-icon://message-error",
						enabled: true,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Negative,
					})
				}],
				isTitleClickable: true,
				state: sap.suite.ui.commons.ProcessFlowNodeState.Positive,
				stateText: "OK status",
				texts: ["Sales Order Document Overdue long text for the wrap up all the aspects", "Not cleared"]
			}, {
				id: "10",
				lane: "1",
				title: "Outbound Delivery 40",
				titleAbbreviation: "OD 40",
				type: sap.suite.ui.commons.ProcessFlowNodeType.Aggregated,
				children: [{
					nodeId: 14,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId10To14",
						text: "6 years",
						icon: "sap-icon://process",
						enabled: true,
						priority: 6,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.PlannedNegative
					})
				}, {
					nodeId: 21,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId10To21",
						enabled: true,
						text: "3d",
						icon: "sap-icon://message-success",
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Positive
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Negative,
				stateText: "NOT OK",
				texts: ["text 1", "text 2"]
			}, {
				id: "11",
				lane: "1",
				title: "Outbound Delivery 43",
				titleAbbreviation: "OD 43",
				children: [{
					nodeId: 14,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId11To14",
						icon: "sap-icon://process",
						enabled: true,
						priority: 7,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Negative
					})
				}, {
					nodeId: 21,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId11To21",
						icon: "sap-icon://message-warning",
						text: "2d 1h",
						enabled: true,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Critical
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Neutral,
				stateText: "Neutral",
				texts: ["text 1", "text 2"]
			}, {
				id: "12",
				lane: "1",
				title: "Outbound Delivery 45",
				titleAbbreviation: "OD 45",
				children: [{
					nodeId: 14,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId12To14",
						text: "2h 15m",
						enabled: true,
						priority: 7,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Positive
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Critical,
				stateText: "OD Issue",
				texts: ["text 1", "text 2"]
			}, {
				id: "13",
				lane: "1",
				title: "Outbound Delivery 47",
				titleAbbreviation: "OD 47",
				children: [{
					nodeId: 14,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId13To14",
						text: "6h 17m",
						enabled: true,
						priority: 7,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Neutral
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Positive,
				stateText: "OK",
				texts: ["text 1", "text 2"]
			}, {
				id: "14",
				lane: "1",
				title: "Outbound Delivery 48",
				titleAbbreviation: "OD 48",
				type: sap.suite.ui.commons.ProcessFlowNodeType.Aggregated,
				children: [{
					nodeId: 20,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "myButtonId14To20",
						text: "1d",
						enabled: true,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Neutral
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Negative,
				stateText: "NOT OK",
				texts: ["text 1", "text 2"]
			}, {
				id: "20",
				lane: "2",
				title: "Invoice 9",
				titleAbbreviation: "I 9",
				children: [30],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Neutral,
				focused: true
			}, {
				id: "21",
				lane: "2",
				title: "Invoice Planned",
				titleAbbreviation: "IP",
				children: null,
				state: sap.suite.ui.commons.ProcessFlowNodeState.PlannedNegative
			}, {
				id: "30",
				lane: "3",
				title: "Accounting Document 7",
				titleAbbreviation: "AD 7",
				children: null,
				state: sap.suite.ui.commons.ProcessFlowNodeState.Positive,
				stateText: "OK status"
			}],
			lanes: [{
				id: "0",
				icon: "sap-icon://notes",
				label: "Ticket",
				position: 0
			}, {
				id: "1",
				icon: "sap-icon://employee-approvals",
				label: "Aprobación",
				position: 1
			}, {
				id: "2",
				icon: "sap-icon://monitor-payments",
				label: "Documento Obligatorio",
				position: 2
			}, {
				id: "3",
				icon: "sap-icon://resize-vertical",
				label: "Bifurcacióón",
				position: 3
			}]
		},

		_oScrollableLanesAndNodesWithLabels: {
			nodes: [{
				id: "1",
				lane: "0",
				title: "Sales Order 1",
				titleAbbreviation: "SO 1",
				children: [{
					nodeId: 10,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "buttonId1To10",
						text: "This is a label with state positive",
						enabled: true,
						icon: "sap-icon://message-success",
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Planned,
					})
				}, {
					nodeId: 11,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "buttonId1To11",
						text: "This is a label with state neutral",
						enabled: true,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Neutral,
					})
				}],
				isTitleClickable: true,
				state: sap.suite.ui.commons.ProcessFlowNodeState.Positive,
				stateText: "OK status",
				texts: ["Sales Order Document Overdue long text for the wrap up all the aspects", "Not cleared"]
			}, {
				id: "10",
				lane: "3",
				title: "Outbound Delivery 40",
				titleAbbreviation: "OD 40",
				type: sap.suite.ui.commons.ProcessFlowNodeType.Aggregated,
				children: [{
					nodeId: 20,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "buttonId10To20",
						enabled: true,
						text: "Ipsum lorem",
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Positive
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Negative,
				stateText: "NOT OK",
				texts: ["text 1", "text 2"]
			}, {
				id: "11",
				lane: "1",
				title: "Outbound Delivery 43",
				titleAbbreviation: "OD 43",
				children: [{
					nodeId: 12,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "buttonId11To12",
						text: "This is a label with state negative",
						icon: "sap-icon://process",
						enabled: true,
						priority: 6,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Negative
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Neutral,
				stateText: "Neutral",
				texts: ["text 1", "text 2"]
			}, {
				id: "12",
				lane: "2",
				title: "Outbound Delivery 45",
				titleAbbreviation: "OD 45",
				children: [{
					nodeId: 20,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "buttonId12To20",
						text: " Lorem ipsum dolor sit amet",
						enabled: true,
						priority: 7,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Positive
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Critical,
				stateText: "OD Issue",
				texts: ["text 1", "text 2"]
			}, {
				id: "20",
				lane: "4",
				title: "Invoice 9",
				titleAbbreviation: "I 9",
				children: null,
				state: sap.suite.ui.commons.ProcessFlowNodeState.Neutral
			}],
			lanes: [{
				id: "0",
				icon: "sap-icon://order-status",
				label: "In Order",
				position: 0
			}, {
				id: "1",
				icon: "sap-icon://monitor-payments",
				label: "In Delivery",
				position: 1
			}, {
				id: "2",
				icon: "sap-icon://payment-approval",
				label: "In Invoice",
				position: 2
			}, {
				id: "3",
				icon: "sap-icon://money-bills",
				label: "In Accounting",
				position: 3
			}, {
				id: "4",
				icon: "sap-icon://money-bills",
				label: "Terminated",
				position: 4
			}]
		},

		_oLanesAndNodesWithLabelsHighlighted: {
			nodes: [{
				id: "1",
				lane: "0",
				title: "Sales Order 1",
				titleAbbreviation: "SO 1",
				children: [{
					nodeId: 10,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id1To10",
						text: "3m",
						enabled: true,
						icon: "sap-icon://message-success",
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Planned,
					})
				}, {
					nodeId: 11,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id1To11",
						text: "2h 15m",
						enabled: false,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Neutral,
					})
				}, {
					nodeId: 12,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id1To12",
						text: "2d",
						enabled: true,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Critical,
					})
				}, {
					nodeId: 13,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id1To13",
						text: "2w 3d",
						icon: "sap-icon://message-error",
						enabled: true,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Negative,
					})
				}],
				isTitleClickable: true,
				state: sap.suite.ui.commons.ProcessFlowNodeState.Positive,
				highlighted: true,
				focused: false,
				stateText: "OK status",
				texts: ["Sales Order Document Overdue long text for the wrap up all the aspects", "Not cleared"]
			}, {
				id: "10",
				lane: "1",
				title: "Outbound Delivery 40",
				titleAbbreviation: "OD 40",
				type: sap.suite.ui.commons.ProcessFlowNodeType.Aggregated,
				children: [{
					nodeId: 14,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id10To14",
						text: "6 years",
						icon: "sap-icon://process",
						enabled: true,
						priority: 6,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Negative
					})
				}, {
					nodeId: 21,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id10To21",
						enabled: true,
						text: "3d",
						icon: "sap-icon://message-success",
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Positive
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Negative,
				stateText: "NOT OK",
				texts: ["text 1", "text 2"]
			}, {
				id: "11",
				lane: "1",
				title: "Outbound Delivery 43",
				titleAbbreviation: "OD 43",
				children: [{
					nodeId: 14,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id11To14",
						icon: "sap-icon://process",
						enabled: true,
						priority: 7,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Negative
					})
				}, {
					nodeId: 21,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id11To21",
						icon: "sap-icon://message-warning",
						text: "2d 1h",
						enabled: true,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Critical
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Neutral,
				highlighted: true,
				stateText: "Neutral",
				texts: ["text 1", "text 2"]
			}, {
				id: "12",
				lane: "1",
				title: "Outbound Delivery 45",
				titleAbbreviation: "OD 45",
				children: [{
					nodeId: 14,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id12To14",
						text: "2h 15m",
						enabled: true,
						priority: 7,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Positive
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Critical,
				stateText: "OD Issue",
				texts: ["text 1", "text 2"]
			}, {
				id: "13",
				lane: "1",
				title: "Outbound Delivery 47",
				titleAbbreviation: "OD 47",
				children: [{
					nodeId: 14,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id13To14",
						text: "6h 17m",
						enabled: true,
						priority: 7,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Neutral
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Positive,
				stateText: "OK",
				texts: ["text 1", "text 2"]
			}, {
				id: "14",
				lane: "1",
				title: "Outbound Delivery 48",
				titleAbbreviation: "OD 48",
				type: sap.suite.ui.commons.ProcessFlowNodeType.Aggregated,
				children: [{
					nodeId: 20,
					connectionLabel: new sap.suite.ui.commons.ProcessFlowConnectionLabel({
						id: "Id14To20",
						text: "1d",
						enabled: true,
						state: sap.suite.ui.commons.ProcessFlowConnectionLabelState.Neutral
					})
				}],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Negative,
				stateText: "NOT OK",
				texts: ["text 1", "text 2"]
			}, {
				id: "20",
				lane: "2",
				title: "Invoice 9",
				titleAbbreviation: "I 9",
				children: [30],
				state: sap.suite.ui.commons.ProcessFlowNodeState.Neutral,
				focused: true
			}, {
				id: "21",
				lane: "2",
				title: "Invoice Planned",
				titleAbbreviation: "IP",
				children: null,
				highlighted: true,
				state: sap.suite.ui.commons.ProcessFlowNodeState.PlannedNegative
			}, {
				id: "30",
				lane: "3",
				title: "Accounting Document 7",
				titleAbbreviation: "AD 7",
				children: null,
				state: sap.suite.ui.commons.ProcessFlowNodeState.Positive,
				stateText: "OK status"
			}],
			lanes: [{
				id: "0",
				icon: "sap-icon://order-status",
				label: "In Order",
				position: 0
			}, {
				id: "1",
				icon: "sap-icon://monitor-payments",
				label: "In Delivery",
				position: 1
			}, {
				id: "2",
				icon: "sap-icon://payment-approval",
				label: "In Invoice",
				position: 2
			}, {
				id: "3",
				icon: "sap-icon://money-bills",
				label: "In Accounting",
				position: 3
			}]
		}

	});

});