# create local user inside docker container that is not root if it does not exits yet
USER_NAME="dummy"
if id -u "$USER_NAME" >/dev/null 2>&1; then
        echo "user already exists"
else
        echo "creating user..."
        # create new user
        bash -c "adduser --disabled-password --gecos '' $USER_NAME"		
        # needed to allow npm link without root
		echo "prefix = /Users/$USER_NAME/npm" >> ~/.npmrc
		mkdir ~/npm
		echo "export PATH=~/npm/bin:$PATH" >> ~/.profile		
fi

# run rest of the script as dummy		
sudo -u dummy bash << EOF

# installing streamup-sensorapi demo
cd streamup-sensorapi-demo
npm install
cd ..

# installing streamup-server-demo
# init npm like described here https://github.com/timoxley/linklocal/issues/14
cd streamup-server-demo
npm install
linklocal -r
linklocal list -r | xargs npm install
cd ..

# installing streamup-teco-gui
cd streamup-teco-gui
npm install
cd ..

# start server 
supervisord -c /etc/supervisor.conf -l log/supervisord.log

# clean up - probably not needed???
#

EOF



