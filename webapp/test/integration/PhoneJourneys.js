jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

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
		"com/promigas/test/integration/NavigationJourneyPhone",
		"com/promigas/test/integration/NotFoundJourneyPhone",
		"com/promigas/test/integration/BusyJourneyPhone"
	], function () {
		QUnit.start();
	});
});