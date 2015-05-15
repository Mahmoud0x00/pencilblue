/*
    Copyright (C) 2015  PencilBlue, LLC

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

module.exports = function(pb) {
    
    //pb dependencies
    var util = pb.util;
    
    /**
     * Interface for managing topics
     */
    function ManageTopics() {}
    util.inherits(ManageTopics, pb.BaseController);

    ManageTopics.prototype.init = function (props, cb) {
        var self = this;
        pb.BaseController.prototype.init.call(self, props, function () {
            self.pathSiteUId = pb.SiteService.getCurrentSite(self.pathVars.siteid);
            pb.SiteService.siteExists(self.pathSiteUId, function (err, exists) {
                if (!exists) {
                    self.reqHandler.serve404();
                }
                else {
                    self.sitePrefix = pb.SiteService.getCurrentSitePrefix(self.pathSiteUId);
                    self.queryService = new pb.SiteQueryService(self.pathSiteUId, true);
                    var siteService = new pb.SiteService();
                    siteService.getSiteNameByUid(self.pathSiteUId, function (siteName) {
                        self.siteName = siteName;
                        cb();
                    });
                }
            });
        });
    };

    var SUB_NAV_KEY = 'manage_topics';

    ManageTopics.prototype.render = function(cb) {
        var self = this;

        var opts = {
            select: pb.DAO.PROJECT_ALL,
            where: pb.DAO.ANYWHERE
        };
        self.queryService.q('topic', opts, function (err, topics) {
            if (util.isError(err)) {
                self.reqHandler.serveError(err);
            }
            else if(topics.length === 0) {

                //none to manage
                return self.redirect('/admin' + self.sitePrefix + '/content/topics/new', cb);
            }

            //currently, mongo cannot do case-insensitive sorts.  We do it manually
            //until a solution for https://jira.mongodb.org/browse/SERVER-90 is merged.
            topics.sort(function(a, b) {
                var x = a.name.toLowerCase();
                var y = b.name.toLowerCase();

                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
            });

            var pills = pb.AdminSubnavService.get(SUB_NAV_KEY, self.ls, SUB_NAV_KEY, {sitePrefix: self.sitePrefix});
            var angularObjects = pb.ClientJs.getAngularObjects(
            {
                navigation: pb.AdminNavigation.get(self.session, ['content', 'topics'], self.ls),
                pills: pb.AdminSubnavService.addSiteToPills(pills, self.siteName),
                topics: topics,
                sitePrefix: self.sitePrefix
            });

            self.setPageName(self.ls.get('MANAGE_TOPICS'));
            self.ts.registerLocal('angular_objects', new pb.TemplateValue(angularObjects, false));
            self.ts.load('admin/content/topics/manage_topics', function(err, data) {
                var result = '' + data;
                cb({content: result});
            });
        });
    };

    ManageTopics.getSubNavItems = function(key, ls, data) {
        var prefix = data.sitePrefix;
        return [{
            name: SUB_NAV_KEY,
            title: ls.get('MANAGE_TOPICS'),
            icon: 'refresh',
            href: '/admin' + prefix + '/content/topics'
        }, {
            name: 'import_topics',
            title: '',
            icon: 'upload',
            href: '/admin' + prefix + '/content/topics/import'
        }, {
            name: 'new_topic',
            title: '',
            icon: 'plus',
            href: '/admin' + prefix + '/content/topics/new'
        }];
    };

    //register admin sub-nav
    pb.AdminSubnavService.registerFor(SUB_NAV_KEY, ManageTopics.getSubNavItems);

    //exports
    return ManageTopics;
};
