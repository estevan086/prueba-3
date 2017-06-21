jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

// We cannot provide stable mock data out of the template.
// If you introduce mock data, by adding .json files in your webapp/localService/mockdata folder you have to provide the following minimum data:
// * At least 3 ticketSet in the list
// * All 3 ticketSet have at least one TicketDetailSet

sap.ui.require([
	"sap/ui/test/Opa5",
	"com/promigas/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/promigas/test/integration/pages/App",
	"com/promigas/test/integration/pages/Browser",
	"com/promigas/test/integration/pages/Master",
	"com/promigas/test/integration/pages/Detail",
	"com/promigas/test/integration/pages/NotFound"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.promigas.view."
	});

	sap.ui.require([
		"com/promigas/test/integration/MasterJourney",
		"com/promigas/test/integration/NavigationJourney",
		"com/promigas/test/integration/NotFoundJourney",
		"com/promigas/test/integration/BusyJourney",
		"com/promigas/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});