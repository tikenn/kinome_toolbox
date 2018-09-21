/*global KINOME module google Blob jQuery save ID $ window*/
(function (exports) {
    "use strict";

    var $page;
    var baseURL = 'http://db.kinomecore.com/1.0.0/name';

    $page = KINOME.page;
    $page.empty();

    /**
     *  Hacky way to include the correlation script demo for u-brite
     */
    if (window.location.href === 'http://mischiefmanaged.tk/?data=*%5Bhttp://db.kinomecore.com/1.0.0/lvl_2.1.2/7564f6c4-635c-47f7-a3cd-7d91df8bd379%7C5c997bc3-919d-4f5d-9d36-57d4592b29ca%7C521d7e30-f194-4017-8b25-0f33bc814ec4%5D*&data=*%5Bhttp://db.kinomecore.com/1.0.0/lvl_2.1.2/3b1796e0-9453-4f01-a807-485e2a34d57a%7C98076d35-3adb-4191-bb3c-a4e3a1fd9a38%7C93b5bbc0-1957-48f6-aae5-e29860267d2b%5D*&data=*%5Bhttp://db.kinomecore.com/1.0.0/lvl_2.1.2/0356d13a-6c54-4010-9d5d-ffe02603df65%7C68399b24-5838-4439-ac28-eef4052c8123%7Cc847a01a-b097-4781-b074-ec10194acfdd%5D*&data=*%5Bhttp://db.kinomecore.com/1.0.0/lvl_2.1.2/5c50f7eb-4f98-4986-bda7-21320f1d822f%7C2c73c6dd-f2a6-4fad-a02b-2d2e83e94574%7Ca62e75e4-b011-4bd8-845b-03da626cb3a3%5D*&data=*%5Bhttp://db.kinomecore.com/1.0.0/lvl_2.1.2/7c1324ec-4d11-4e38-aa08-bcb799ae1ce4%7C8c85d4ac-4973-4af0-ae74-07aab66fa75e%7C2ef2d720-a376-4d0d-93aa-7e398dfc3e55%5D*&data=*%5Bhttp://db.kinomecore.com/1.0.0/lvl_2.1.2/33e204c6-eee6-4023-ba7d-2de29a3e2e59%7C2b760a4c-1409-4353-935f-7247879d12fa%7C25c6468b-793c-40b6-a21a-a9a73ae28397%5D*&data=*%5Bhttp://db.kinomecore.com/1.0.0/lvl_2.1.2/1dee435f-b42b-4f9f-9dc8-488ab1600803%7C1b9acc27-9617-4bce-9428-784001f2d4a8%7C5bc5037a-c374-45c1-a522-18f692c2c121%5D*&data=*%5Bhttp://db.kinomecore.com/1.0.0/lvl_2.1.2/84cc68c0-3144-4491-be1a-320ea87bf7b6%7Cfa2f0442-ecb6-40d4-949e-e7373fac5ff4%7Cf48633d8-64ec-472b-93e9-3e9c157d2403%5D*&data=*%5Bhttp://db.kinomecore.com/1.0.0/lvl_2.1.2/d62df0ee-1ff1-4d37-87a0-67b24e60ff1e%7Cfd133b2d-0686-46a9-9cbf-c3cbebe21d7a%7Ca714b0d1-ad3e-49e8-8e0d-d9426adab93e%5D*&data=*%5Bhttp://db.kinomecore.com/1.0.0/lvl_2.1.2/4b916253-e655-4fbd-8e12-d22a0e6781e3%7C093fdf9e-be6a-4727-adab-4a873245b534%7C7b4c4b25-8966-414c-9d04-d4f2fdd48fda%5D*') {
        require('../../../plugins/kinetic_build_them_all.js');
    }

    /**
     *  Hacky way to include the survival script demo for u-brite
     */
    if (window.location.href === 'http://mischiefmanaged.tk/?data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Fe2143e80-639d-4297-8ff9-afa2217e4e26%7C73ce4b2b-168b-4201-bdf9-3acc6c94c763%7Cc278e972-102d-4ab7-8b19-3eebbd280c13%7C5c45472c-a91b-4f11-bb35-43e637a8f41e%7C85e6ff95-b6fb-49b1-aa6d-35a5aa9e4f0c%7C0bb628e1-e75b-469c-9ae5-5cd4b40dbdb9%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2F5baaa1c4-c3fa-46c1-8297-5ca2c8b957e9%7C5983322f-abaa-4127-913d-60e9d592f443%7C9a225707-3d91-4526-b39c-91a74a827a9d%7C5905999a-2983-4886-9c74-db65e968d12d%7C05e62f1e-cfd2-4011-94f7-79670219f277%7Cf9d461ac-0a6b-4127-afa2-5f68ed004e0f%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2F7564f6c4-635c-47f7-a3cd-7d91df8bd379%7C5c997bc3-919d-4f5d-9d36-57d4592b29ca%7C521d7e30-f194-4017-8b25-0f33bc814ec4%7Cbc951bba-9748-470a-ad59-fe70ec545fcf%7C7ae6cf41-361d-4dfc-b0d2-8b1a3c870699%7C45a53317-0930-4f93-a160-eae4a11caa1b%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2F933ab523-0481-48e1-90ab-66f98de56868%7C9479f058-136d-4ca3-a1f6-6b192e1ea9f1%7Cf381fad0-cab4-46a3-8da8-d1cd41c8f46e%7C23255653-26f8-444a-9381-f4d9422df645%7Ca940411a-8b25-464a-9253-6aac59eaa5da%7C800ef1b8-f7f0-4a85-9352-806b32df1bb9%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2F7c1324ec-4d11-4e38-aa08-bcb799ae1ce4%7C8c85d4ac-4973-4af0-ae74-07aab66fa75e%7C2ef2d720-a376-4d0d-93aa-7e398dfc3e55%7C380f4985-73d8-4da7-aa1e-1cdf2f300848%7Ca4f88e31-78d6-4e4f-bda0-120033a72139%7Ca96c38ff-431d-4020-b244-e394e7dd8286%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2F1dee435f-b42b-4f9f-9dc8-488ab1600803%7C1b9acc27-9617-4bce-9428-784001f2d4a8%7C5bc5037a-c374-45c1-a522-18f692c2c121%7C2c0da759-f6c9-4909-b0c5-ca97f3cbd03e%7C61439ec0-3adb-4147-859b-b2543854372f%7C1aa66a6f-1066-46e3-8155-3ce4c054a7fa%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Fd62df0ee-1ff1-4d37-87a0-67b24e60ff1e%7Cfd133b2d-0686-46a9-9cbf-c3cbebe21d7a%7Ca714b0d1-ad3e-49e8-8e0d-d9426adab93e%7C96a828c8-3dd4-413f-92f0-1d41a33d17b7%7C36ae895e-22de-40dc-a13c-19e8fd73d2e1%7Cb2e0aa03-58eb-44bb-a5d6-e6d1ed081812%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Fd6ed801c-d6d3-4b26-bd26-ebede5c74399%7Cc444f1dd-e3dc-46cd-b847-a8a1d9770290%7C31a1f97e-ba20-44a8-9a05-6ae83e13a155%7C12092ac4-0ae3-4cd2-a21a-a5d10122885b%7C0f8bc31a-7adb-4e1d-89ba-dd745509578a%7C9f087a10-aa2d-469b-a05b-7ff209aa833f%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2F66ee0e35-ff7d-4d49-b786-d99fc126a865%7Cc807437f-ddf7-4d71-80bf-f4d61353d9fd%7Cd8397b8f-5504-4ce9-89a2-1a6b64d18d86%7Cd7e6facb-3d1c-418d-af32-96a9759e2310%7C6c85d25f-9cd0-4a45-b43b-e3ec6d04055e%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Ff953dc32-f01d-42c5-a7cb-44d1f60a48b0%7Cdb9e46a3-0ae0-4905-8d8f-33d0265f6a12%7C8f58b893-c5c4-451c-968f-6eaf29c02764%7C06abfa45-2f8e-4f17-9e86-fbf7d394ffa3%7Cb045bcbc-5998-45c7-8348-1b16e0da827d%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Fdf1b0ad1-2669-4357-a874-15cb603fe1e3%7C805e4473-1041-4671-a824-c3595b42f09a%7C0ab6aceb-609b-4514-b3c4-ea767d0812fb%7Ce4c4df04-6b6f-42ce-9fe4-1faddd2fb03d%7Cd715a9dd-ec4c-4c8b-b4bd-df2f6c6d66e3%7C734e424a-cc77-4cc5-9be9-25834e653d15%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Fb6932052-3b9d-48b5-9d1a-b810764e3981%7C89906475-479e-4b2e-a8d5-b0e5fcae73f4%7C75904437-9131-4290-8eb3-4b4cf9fa65f8%7C8ae14720-002e-45c4-b6a1-70da09742006%7C991b5366-bc8a-4cde-a127-bea815fdff44%7Cfbb0355c-7422-49d0-8c59-1b8430a10211%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Fc35c2ec6-bcf9-43b4-bc41-4bfb0735ae83%7C4de571e5-d4a7-4cd1-8697-13cfa5965c54%7C9dc221c5-a621-4745-b2be-6aab2f8dd154%7C75b0fed3-7cb6-491c-803c-53ab2b1467a9%7Cb5b3524d-03f7-49e0-9274-86e23eec0962%7C0dfc60a5-2b38-493e-b049-9b5a7860fdda%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Fbc46d1eb-e157-434b-9045-a7e5f36e66ba%7C81f07fd4-0827-44f1-a32c-ab6415592056%7C8d0ba5ea-46fd-4717-82a6-3fcb10b35847%7Cb6332154-10f0-41ec-b6a1-6175f91f5eeb%7Cd73606c1-1a7a-4ba5-bf82-ab93429df8d5%7C562f60f1-4df5-445d-9fb5-c81a655d13cc%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Fce29ae18-8266-4a3e-bda3-b321cc50098d%7Cf247af1a-e54b-437f-a0ce-9c0369eecc50%7C92bb90b9-1ab9-4860-89d2-f9a29a7c309b%7C1ea1f8f9-8150-4f67-8c98-bd21d9db6580%7C3fec991f-39d1-45dd-99a0-5c55f64a6b75%7C1424d900-1c7a-4c9f-9f0d-3f84aee682b9%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Fcc4ba0aa-1c46-41e0-9634-9206f899e919%7Cd726cfa9-0cd0-4c9e-a8bf-316f20df2bad%7C2606f0b4-e6d7-4030-958d-4861b9183907%7Cc31e2b77-f7b6-4ec7-930d-55c52e6efe74%7C58c976c1-91cd-4bef-a8d3-13d2695621aa%7C6dd14877-7615-4766-b737-150b21a65fdb%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2Fc967fbb2-6fdf-49e8-ae22-65b56c1177c2%7C4e9a9313-c453-437f-8d88-a07b3ff5f285%7C47112c58-8d1d-42ea-89a8-004b668fabe7%7Cddd5180b-9296-488b-8ba4-4f560e9ede46%7Cce4f5921-ab35-41a1-b92f-abba8b0012b6%5D*&data=*%5Bhttp%3A%2F%2Fdb.kinomecore.com%2F1.0.0%2Flvl_2.1.2%2F7a8f067c-d2f7-4930-8261-01360deb6620%7C9cfd53e1-745a-462d-8fe8-20c5290ede7a%7C4a3b87dd-2c2a-4de4-bc29-c8160e6cfa1c%7C5bbe9775-37b2-4d64-9a47-d89e207912c7%7Cb2447ef3-2abe-44bd-a01f-765d337d1658%5D*') {
        require('../../../plugins/survival_analysis.js');
    }


    if (KINOME.params.data.length === 0) {
        $page.append('<div class="text-center alert alert-info"><h2>We noticed you do not have any data loaded, we are starting the page with our public database, please wait...</h2></div>');
        KINOME.loadData(baseURL).then(function () {
            return KINOME.loadData('local://name');
        }).then(function () {
            return require('name');
        });
    } else {
        //load UI scripts that correspond to types
        KINOME.list('levels').map(function (x) {
            return require(x, 'js').catch(function (err) {
                KINOME.error(err, 'No default options for level: ' + x);
            });
        });
    }

    return exports;
}(
    ("undefined" !== typeof module && module.exports)
        ? module.exports
        : KINOME
));