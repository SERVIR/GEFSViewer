from tethys_sdk.base import TethysAppBase, url_map_maker


class Gefs(TethysAppBase):
    """
    Tethys app class for GEFS Viewer.
    """

    name = 'GEFS Viewer'
    index = 'gefs:home'
    icon = 'gefs/images/logo.png'
    package = 'gefs'
    root_url = 'gefs'
    color = '#27ae60'
    description = 'View latest GEFS data'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='gefs',
                controller='gefs.controllers.home'
            ),
            UrlMap(
                name='get-ts',
                url='gefs/get-ts',
                controller='gefs.controllers.get_ts'),
            UrlMap(
                name='upload-shp',
                url='gefs/upload-shp',
                controller='gefs.controllers.upload_shp'),
        )

        return url_maps
