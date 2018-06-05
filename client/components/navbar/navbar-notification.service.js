class NavbarNotificationService {
    constructor ($interval, $q, $translate, OvhApiNotificationAapi, TARGET, UNIVERSE) {
        this.$interval = $interval;
        this.$q = $q;
        this.$translate = $translate;
        this.OvhApiNotificationAapi = OvhApiNotificationAapi;
        this.TARGET = TARGET;
        this.UNIVERSE = UNIVERSE;

        this.NOTIFICATION_REFRESH_TIME = 60000;
    }

    getMessages () {
        return this.$translate.refresh().then(() => this.OvhApiNotificationAapi.query({
            lang: this.$translate.preferredLanguage(),
            target: this.TARGET,
            universe: this.UNIVERSE
        }).$promise);
    }

    getSubLinks () {
        return this.getMessages().then((messages) => messages.map((message) => this.convertSubLink(message))).catch(() => [{
            id: "0",
            date: moment(),
            time: this._formatTime(moment()),
            level: "error",
            subject: this.$translate.instant("common_navbar_notification_error_subject"),
            description: this.$translate.instant("common_navbar_notification_error")
        }]);
    }

    _formatTime (dateTime) {
        return moment(dateTime).fromNow();
    }

    _toggleSublinkAction (toUpdate, linkClicked) {
        if (toUpdate.isActive && !toUpdate.updating) {
            toUpdate.updating = true;
            this.OvhApiNotificationAapi.post({ completed: [toUpdate.id] }).$promise.then(() => {
                toUpdate.isActive = false;
                toUpdate.acknowledged = true;
            }).finally(() => { toUpdate.updating = false; });
        } else if (!toUpdate.isActive && !toUpdate.updating && !linkClicked) {
            toUpdate.updating = true;
            this.OvhApiNotificationAapi.post({ acknowledged: [toUpdate.id] }).$promise.then(() => {
                toUpdate.isActive = true;
                toUpdate.acknowledged = true;
            }).finally(() => { toUpdate.updating = false; });
        }
    }

    convertSubLink (notification) {
        notification.time = this._formatTime(notification.date);
        notification.url = notification.urlDetails.href;
        notification.isActive = _.contains(["acknowledged", "delivered"], notification.status);
        notification.acknowledged = _.contains(["acknowledged", "completed", "unknown"], notification.status);
        notification.actionClicked = (toUpdate) => this._toggleSublinkAction(toUpdate);
        notification.linkClicked = (toUpdate) => this._toggleSublinkAction(toUpdate, true);
        return notification;
    }

    acknowledgeAll () {
        if (this.navbarContent) {
            const toAcknowledge = this.navbarContent.subLinks
                .filter((subLink) => !subLink.acknowledged && subLink.isActive);
            if (toAcknowledge.length) {
                this.OvhApiNotificationAapi.post({ acknowledged: toAcknowledge.map((x) => x.id) }).$promise.then(() => {
                    toAcknowledge.forEach((sublink) => {
                        sublink.acknowledged = true;
                    });
                });
            }
        }
    }

    _setRefreshTime (sublinks) {
        if (this.formatTimeTask) {
            this.$interval.cancel(this.formatTimeTask);
        }
        this.formatTimeTask = this.$interval(() => {
            sublinks.forEach((notification) => {
                notification.time = this._formatTime(notification.date);
            });
        }, this.NOTIFICATION_REFRESH_TIME);
    }

    getNavbarContent () {
        return this.getSubLinks().then((sublinks) => {
            this._setRefreshTime(sublinks);
            const navbarContent = {
                name: "notifications",
                title: this.$translate.instant("common_navbar_notification_title"),
                iconClass: "icon-notifications",
                limitTo: 10,
                onClick: () => this.acknowledgeAll(),
                subLinks: sublinks,
                show: this.TARGET === "EU" || this.TARGET === "CA"
            };
            this.navbarContent = navbarContent;
            return navbarContent;
        });
    }
}

angular.module("managerApp").service("NavbarNotificationService", NavbarNotificationService);
