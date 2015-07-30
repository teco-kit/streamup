# init npm like described here https://github.com/timoxley/linklocal/issues/14
cd streamup-demo
npm install
linklocal -r
linklocal list -r | xargs npm install --cache-min=Infinity
cd ..

# start server 
supervisord -c /etc/supervisor.conf

# clean up - probably not needed???
#
