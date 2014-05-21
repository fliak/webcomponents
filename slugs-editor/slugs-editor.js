Polymer('slugs-editor',  {
    value: null,
    slugs: [],
    adminId: '',
    fieldName: 'slugs',
    discoverBlockRoute: 'dynamic_cms_blockdiscover',
    discoverBlockUrl: '',
    variablePattern: '',

    defaultsManager: {},

    blockInfo: {},

    parentModel: {},

    json: {
        toModel: function(value) {
            return JSON.parse(value);
        },
        toView: function(value) {
            console.log('VALUE', value)
            return JSON.stringify(value);
        }
    },

    ready: function()   {
        console.log('slugs editor ready')
    },
    created: function() {
        this.slugs = [];
    },

    getSlugs: function()    {
        return this.slugs;
    },

    attributeChangedCallback: function(attributeName, oldValue, newValue)    {
        if (attributeName === 'blocks') {
            this.refreshSlugs(JSON.parse(newValue));
        }
    },

    setParentModel: function(model)  {
        this.parentModel = model;
        console.log('we get parent', model)

    },

    updateValue: function() {
        this.value = JSON.stringify(this.slugs);

        var slugNames = [];
        for (var i in this.slugs)   {
            slugNames.push(this.slugs[i].name);
        }

        if (slugNames.length > 0)   {
            this.variablePattern = '/{' + slugNames.join('}/{') + '}';
        }
        else    {
            this.variablePattern = '';
        }

    },

    getVariablePattern: function() {
        return this.variablePattern;
    },

    detachParam: function(event, detail, sender)  {

        var linkIndex = sender.getAttribute('linkIndex');
        var parentLi = $(sender).parents('li[slugIndex]');
        var slugIndex = parentLi.attr('slugIndex');

        var link = this.slugs[slugIndex].links.splice(linkIndex, 1)[0];
        this.slugs.push({
            name: this._generateSlugName(link.blockPlace, link.originParamName),
            links: [link]
        })
    },

    refreshSlugs: function(blocks)    {
        console.log('blocks', blocks)

        var packOfDeferred = [];

        for (var blockPlace in blocks)   {
            var blockPath = blocks[blockPlace];

            var deferredObject = $.Deferred();
            this.discoverBlock(blockPath, deferredObject.resolve);

            packOfDeferred.push(deferredObject);
        }

        var that = this;
        $.when.apply(this, packOfDeferred).done(function() {
            console.log('finish')
            for (var blockPlace in blocks)   {
                var blockPath = blocks[blockPlace];
                var blockInfo = that.blockInfo[blockPath];

                paramCheck:
                    for (var paramName in blockInfo)    {

                        var paramInfo = blockInfo[paramName];

                        for (var i = 0; i < that.slugs.length; i++)    {
                            var links = that.slugs[i].links;
                            for (var j = 0; j < links.length; j++)    {
                                if (links[j].blockPlace === blockPlace && links[j].originParamName === paramName)   {
                                    links[j].transformerService = paramInfo.transformerService;

                                    continue paramCheck;
                                }
                            }
                        }

                        that.addSlug(blockPlace, paramName, paramInfo)

                    }
            }
        });
    },

    addSlug: function(blockPlace, originParamName, paramInfo) {
        var slugName = this._generateSlugName(blockPlace, originParamName);
        if (!Array.isArray(this.slugs)) this.slugs = [];
        this.slugs.push({
            name: slugName,
            links: [{
                blockPlace: blockPlace,
                originParamName: originParamName,
                transformerService: paramInfo.transformerService
            }]
        });


    },

    discoverBlock: function(blockPath, callback) {

        if (this.blockInfo[blockPath] !== undefined)    { //check for already discovered
            callback.call(this, {
                'success': true,
                'block_properties': this.blockInfo[blockPath]
            });

            return;
        }

        var discoverBlockUrl = Routing.generate(this.discoverBlockRoute, {
            "blockPath": blockPath
        });

        var ajax = document.createElement('polymer-ajax');
        ajax.setAttribute('url', discoverBlockUrl);
        ajax.setAttribute('handleAs', 'json');

        var that = this;
        ajax.addEventListener('polymer-response', function(e)    {

            if (e.detail.xhr.statusText === 'OK')   {
                var response = e.detail.response;
                if (typeof(response) === 'string')  {
                    response = JSON.parse(response);
                }

                if (response.success)   {
                    var blockPath = response.blockPath;
                    that.blockInfo[blockPath] = response.block_properties;
                }

                if (typeof(callback) === 'function')    {
                    callback.call(this, response);
                }

            }
        });

        ajax.go();

        console.log(blockPath, this.discoverBlockUrl, ajax)
    },

    _generateSlugName: function(blockPlace, originParamName)  {
        return 'slug_' + blockPlace + '_' + originParamName;
    },



    removeParam: function(event, detail, sender)  {

        var linkIndex = sender.getAttribute('linkIndex');
        var parentLi = $(sender).parents('li[slugIndex]');
        var slugIndex = parentLi.attr('slugIndex');
        this.slugs[slugIndex].links.splice(linkIndex, 1);
    },

    _getCheckedSlugs: function()    {
        var slugIndex;
        var checkedSlugs = [];

        $(this.$.slugs).find('input.slug-mark').each(function() {
            if (this.checked)   {
                slugIndex = $(this).parents('li[slugIndex]').attr('slugIndex');
                checkedSlugs.push(slugIndex);
            }
        });

        return checkedSlugs;
    },

    mergeSlugs: function(event, detail, sender)  {
        var checkedSlugs = this._getCheckedSlugs();

        if (checkedSlugs.length > 0)    {
            var mergedLinks = [];
            var i;
            var firstSlug = this.slugs[checkedSlugs[0]];
            for (i = 0; i < checkedSlugs.length; i++)   {
                mergedLinks = mergedLinks.concat(this.slugs[checkedSlugs[i]].links)
            }

            for (i = checkedSlugs.length; i >= 0; i--)   {
                this.slugs.splice(checkedSlugs[i], 1); //remove slug
            }
            console.log('mergedLinks', mergedLinks)
            console.log('firstSlug', firstSlug)

            firstSlug.links = mergedLinks;
            this.slugs.push(firstSlug);

        }

    },

    removeSlug: function()  {

        var checkedSlugs, i;
        checkedSlugs = this._getCheckedSlugs();
        if (checkedSlugs.length > 0)    {
            for (i = checkedSlugs.length - 1; i >= 0; i--)   {
                console.log(i, checkedSlugs[i])
                this.slugs.splice(checkedSlugs[i], 1);
            }
        }
    }
});


