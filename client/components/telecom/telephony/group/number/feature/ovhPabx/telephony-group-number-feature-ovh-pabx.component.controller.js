angular.module("managerApp").controller("TelephonyNumberOvhPabxCtrl", function ($q, $translate, $translatePartialLoader, TelephonyMediator, Toast) {
    "use strict";

    var self = this;

    self.popoverDatas = {
        isOpen: false,
        configType: null
    };

    self.loading = {
        dialplan: false,
        translations: false
    };

    self.ovhPabx = null;
    self.dialplan = null;

    /*= ==============================
    =            HELPERS            =
    ===============================*/

    self.refreshDisplayedDialplan = function () {
        // for the moment it will only have one dialplan per ovhPabx. So we take the first.
        self.dialplan = _.get(self.numberCtrl.number.feature.dialplans, "[0]");
    };

    /* -----  End of HELPERS  ------*/

    /*= =====================================
    =            INITIALIZATION            =
    ======================================*/

    /* ----------  Translations load  ----------*/

    function getTranslations () {
        self.loading.translations = true;

        // load ovhPabx translations
        $translatePartialLoader.addPart("../components/telecom/telephony/group/number/feature/ovhPabx");

        // load time condition slot transations
        $translatePartialLoader.addPart("../components/telecom/telephony/timeCondition/slot");

        // load specific types translations
        $translatePartialLoader.addPart("../components/telecom/telephony/group/number/feature/ovhPabx/types/" + (self.ovhPabx.isCCS ? "ccs" : self.ovhPabx.featureType));
        return $translate.refresh().finally(function () {
            self.loading.translations = false;
        });
    }

    /* ----------  Component initialization  ----------*/

    self.$onInit = function () {
        var initPromises;

        // set loading
        self.numberCtrl.loading.feature = true;

        // set ovhPabx
        self.ovhPabx = self.numberCtrl.number.feature;

        return getTranslations().then(function () {
            initPromises = [
                self.ovhPabx.getDialplans(),
                self.ovhPabx.getSounds(),
                TelephonyMediator.getAll()
            ];

            if (self.ovhPabx.featureType === "cloudIvr" || (self.ovhPabx.isCCS && self.ovhPabx.featureType === "cloudHunting")) {
                initPromises.push(self.ovhPabx.getMenus());
            }
            if (self.ovhPabx.featureType === "cloudHunting") {
                initPromises.push(self.ovhPabx.getQueues());
                if (self.ovhPabx.isCCS) {
                    initPromises.push(self.ovhPabx.getTts());
                }
            }

            return $q.allSettled(initPromises);
        }).then(function () {
            self.refreshDisplayedDialplan();
        }).finally(function () {
            self.numberCtrl.loading.feature = false;
        }).catch(function (error) {
            Toast.error($translate.instant("telephony_number_feature_ovh_pabx_load_error"));
            return $q.reject(error);
        });
    };

    /* -----  End of INITIALIZATION  ------*/


});
